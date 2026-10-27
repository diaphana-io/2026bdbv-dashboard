import type { MapAggregate } from "@/lib/data-types";
import provincesData from "../../data/cd_provinces.json";
import territoriesData from "../../data/cd_territories.json";
import healthZonesData from "../../data/cd_health_zones.json";
import type { BoundaryLevel } from "./map-ui-context";

export type StatsDotStatus =
  | "confirmed"
  | "suspected"
  | "recovered"
  | "deceased";

export type StatsDot = {
  lng: number;
  lat: number;
  status: StatsDotStatus;
};

/** High-contrast on Papers light land (not near-white). */
export const STATS_DOT_COLORS: Record<StatsDotStatus, string> = {
  confirmed: "#18181b",
  suspected: "#d97706",
  recovered: "#059669",
  deceased: "#dc2626",
};

type LonLat = [number, number];
type Ring = LonLat[];
type PolyRings = Ring[]; // exterior + holes

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry:
      | { type: "Polygon"; coordinates: number[][][] }
      | { type: "MultiPolygon"; coordinates: number[][][][] };
  }>;
};

const provinces = provincesData as FeatureCollection;
const territories = territoriesData as FeatureCollection;
const healthZones = healthZonesData as FeatureCollection;

/** Deterministic 0..1 from string (mulberry-ish). */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function shuffleStatuses(
  statuses: StatsDotStatus[],
  seed: string,
): StatsDotStatus[] {
  const out = [...statuses];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(hash01(`${seed}:${i}`) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toRing(coords: number[][]): Ring {
  return coords.map((c) => [c[0], c[1]] as LonLat);
}

function geometryToPolys(
  geometry: FeatureCollection["features"][number]["geometry"],
): PolyRings[] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates.map(toRing)];
  }
  return geometry.coordinates.map((poly) => poly.map(toRing));
}

/** Ray-cast; holes subtract. Ring is closed or open. */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPoly(lng: number, lat: number, poly: PolyRings): boolean {
  if (poly.length === 0) return false;
  if (!pointInRing(lng, lat, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) {
    if (pointInRing(lng, lat, poly[h])) return false;
  }
  return true;
}

function pointInAny(lng: number, lat: number, polys: PolyRings[]): boolean {
  return polys.some((p) => pointInPoly(lng, lat, p));
}

function bboxOf(polys: PolyRings[]): {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
} {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const poly of polys) {
    for (const [lng, lat] of poly[0] ?? []) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

/**
 * Deterministic grid over bbox, keep PIP hits, densify until n points.
 */
function scatterInPolys(
  polys: PolyRings[],
  n: number,
  seed: string,
): LonLat[] {
  if (n <= 0 || polys.length === 0) return [];
  const { minLng, maxLng, minLat, maxLat } = bboxOf(polys);
  if (!Number.isFinite(minLng) || maxLng <= minLng || maxLat <= minLat) {
    return [];
  }

  const candidates: LonLat[] = [];
  let side = Math.max(4, Math.ceil(Math.sqrt(n * 4)));
  const maxSide = 96;

  while (candidates.length < n && side <= maxSide) {
    candidates.length = 0;
    for (let r = 0; r < side; r++) {
      for (let c = 0; c < side; c++) {
        const u = (c + 0.5) / side;
        const v = (r + 0.5) / side;
        const jx = (hash01(`${seed}:gx:${side}:${r}:${c}`) - 0.5) / side;
        const jy = (hash01(`${seed}:gy:${side}:${r}:${c}`) - 0.5) / side;
        const lng = minLng + (u + jx * 0.4) * (maxLng - minLng);
        const lat = minLat + (v + jy * 0.4) * (maxLat - minLat);
        if (pointInAny(lng, lat, polys)) candidates.push([lng, lat]);
      }
    }
    side = Math.ceil(side * 1.5);
  }

  if (candidates.length === 0) {
    // Fallback: centroid of first exterior ring
    const ring = polys[0][0];
    let sx = 0;
    let sy = 0;
    for (const [x, y] of ring) {
      sx += x;
      sy += y;
    }
    const cen: LonLat = [sx / ring.length, sy / ring.length];
    return Array.from({ length: n }, () => cen);
  }

  // Pick n evenly spaced candidates (stable).
  const out: LonLat[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(((i + 0.5) / n) * candidates.length) % candidates.length;
    // slight per-dot jitter still inside: re-validate once
    const base = candidates[idx];
    const jlng =
      base[0] +
      (hash01(`${seed}:pjx:${i}`) - 0.5) * ((maxLng - minLng) / side) * 0.3;
    const jlat =
      base[1] +
      (hash01(`${seed}:pjy:${i}`) - 0.5) * ((maxLat - minLat) / side) * 0.3;
    out.push(
      pointInAny(jlng, jlat, polys) ? [jlng, jlat] : [base[0], base[1]],
    );
  }
  return out;
}

/** Centroid lattice fallback when no COD-AB polygon (e.g. KE/UG/NG). */
function scatterAround(
  lon: number,
  lat: number,
  n: number,
  seed: string,
  spreadDeg = 0.08,
): LonLat[] {
  if (n <= 0) return [];
  if (n === 1) return [[lon, lat]];
  const cols = Math.ceil(Math.sqrt(n));
  const pts: LonLat[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const u = (c + 0.5) / cols - 0.5;
    const v = (r + 0.5) / cols - 0.5;
    const jx = (hash01(`${seed}:x:${i}`) - 0.5) * spreadDeg * 0.35;
    const jy = (hash01(`${seed}:y:${i}`) - 0.5) * spreadDeg * 0.35;
    pts.push([lon + u * spreadDeg + jx, lat + v * spreadDeg + jy]);
  }
  return pts;
}

function pcodeKey(level: "admin1" | "admin2" | "admin3"): string {
  if (level === "admin1") return "adm1_pcode";
  if (level === "admin2") return "adm2_pcode";
  return "adm3_pcode";
}

function collectionFor(
  level: "admin1" | "admin2" | "admin3",
): FeatureCollection {
  if (level === "admin1") return provinces;
  if (level === "admin2") return territories;
  return healthZones;
}

function resolveSampleLevel(
  boundaryLevel: BoundaryLevel,
): "admin1" | "admin2" | "admin3" {
  if (boundaryLevel === "admin2") return "admin2";
  if (boundaryLevel === "admin3") return "admin3";
  // auto + admin1 → provinces
  return "admin1";
}

function buildPolyIndex(
  level: "admin1" | "admin2" | "admin3",
): Map<string, PolyRings[]> {
  const col = collectionFor(level);
  const key = pcodeKey(level);
  const map = new Map<string, PolyRings[]>();
  for (const f of col.features) {
    const code = f.properties[key];
    if (typeof code !== "string") continue;
    const polys = geometryToPolys(f.geometry);
    const prev = map.get(code);
    if (prev) prev.push(...polys);
    else map.set(code, polys);
  }
  return map;
}

/** All CD province polys — for country-level CD aggregates. */
function cdProvinceUnion(): PolyRings[] {
  const out: PolyRings[] = [];
  for (const f of provinces.features) {
    out.push(...geometryToPolys(f.geometry));
  }
  return out;
}

const CD_PROVINCE_UNION = cdProvinceUnion();

/**
 * Build 1-dot-per-case features from MapAggregate counts.
 * Positions: PIP grid inside COD-AB unit (or CD province union); else centroid lattice.
 */
export function buildStatsDots(
  aggregates: MapAggregate[],
  asOf: string,
  boundaryLevel: BoundaryLevel | "admin1" | "admin2" | "admin3",
): StatsDot[] {
  const sampleLevel = resolveSampleLevel(boundaryLevel);
  const index = buildPolyIndex(sampleLevel);
  const dots: StatsDot[] = [];

  for (const a of aggregates) {
    const statuses: StatsDotStatus[] = [];
    for (let i = 0; i < Math.max(0, a.confirmed); i++) {
      statuses.push("confirmed");
    }
    for (let i = 0; i < Math.max(0, a.deaths); i++) {
      statuses.push("deceased");
    }
    if (statuses.length === 0) continue;

    const seed = `${a.admin_iso}:${asOf}:${sampleLevel}`;
    const shuffled = shuffleStatuses(statuses, seed);

    let pts: LonLat[] = [];
    const unitPolys = index.get(a.admin_iso);
    if (unitPolys && unitPolys.length > 0) {
      pts = scatterInPolys(unitPolys, shuffled.length, seed);
    } else if (a.admin_iso === "CD") {
      // Country total: spread evenly inside all provinces.
      pts = scatterInPolys(CD_PROVINCE_UNION, shuffled.length, seed);
    } else if (a.admin_iso.length <= 2) {
      // Other tracked countries — no COD-AB; lattice around centroid.
      pts = scatterAround(a.lon, a.lat, shuffled.length, seed, 0.35);
    } else {
      // Subnational code not in selected level index — skip (avoid double-count).
      continue;
    }

    for (let i = 0; i < shuffled.length; i++) {
      const p = pts[i] ?? pts[0] ?? [a.lon, a.lat];
      dots.push({ lng: p[0], lat: p[1], status: shuffled[i] });
    }
  }
  return dots;
}

export function statsDotsGeoJson(dots: StatsDot[]) {
  return {
    type: "FeatureCollection" as const,
    features: dots.map((d, i) => ({
      type: "Feature" as const,
      properties: {
        id: `dot-${i}`,
        status: d.status,
        kind: "stats-dot",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [d.lng, d.lat],
      },
    })),
  };
}
