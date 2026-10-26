import type { MapAggregate } from "@/lib/data-types";
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

export const STATS_DOT_COLORS: Record<StatsDotStatus, string> = {
  confirmed: "#f4f4f5",
  suspected: "#fbbf24",
  recovered: "#34d399",
  deceased: "#f87171",
};

type LonLat = [number, number];

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

/**
 * Even-ish lattice around a centroid with deterministic jitter.
 * Used when we only have aggregate lat/lon (no polygon sampling yet).
 */
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
  const rows = Math.ceil(n / cols);
  const pts: LonLat[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const u = (c + 0.5) / cols - 0.5;
    const v = (r + 0.5) / rows - 0.5;
    const jx = (hash01(`${seed}:x:${i}`) - 0.5) * spreadDeg * 0.35;
    const jy = (hash01(`${seed}:y:${i}`) - 0.5) * spreadDeg * 0.35;
    pts.push([lon + u * spreadDeg + jx, lat + v * spreadDeg + jy]);
  }
  return pts;
}

/**
 * Build 1-dot-per-case features from MapAggregate counts.
 * Positions: even lattice around each unit centroid; status colors shuffled.
 * `boundaryLevel` / effective LOD selects which aggregates to treat as units
 * (caller filters aggregates to the active admin level).
 */
export function buildStatsDots(
  aggregates: MapAggregate[],
  asOf: string,
  _boundaryLevel: BoundaryLevel | "admin1" | "admin2" | "admin3",
): StatsDot[] {
  const dots: StatsDot[] = [];
  for (const a of aggregates) {
    // Country totals (e.g. admin_iso "CD") get a wider spread.
    const isCountry = a.admin_iso.length <= 2;
    const spread = isCountry ? 1.2 : 0.12;
    const statuses: StatsDotStatus[] = [];
    for (let i = 0; i < Math.max(0, a.confirmed); i++) {
      statuses.push("confirmed");
    }
    for (let i = 0; i < Math.max(0, a.deaths); i++) {
      statuses.push("deceased");
    }
    if (statuses.length === 0) continue;
    const seed = `${a.admin_iso}:${asOf}`;
    const shuffled = shuffleStatuses(statuses, seed);
    const pts = scatterAround(a.lon, a.lat, shuffled.length, seed, spread);
    for (let i = 0; i < shuffled.length; i++) {
      dots.push({
        lng: pts[i][0],
        lat: pts[i][1],
        status: shuffled[i],
      });
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
