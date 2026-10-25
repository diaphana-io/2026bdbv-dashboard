/**
 * Basemap catalog for Navara OutbreakMap.
 * - `native-raster`: XYZ raster tiles (satellite) on ellipsoid terrain.
 * - `outline`: ellipsoid + Papers Natural Earth MVT (coast/borders) + graticule.
 */

/** Case marker stroke/fill palette keyed off basemap. */
export type CaseLayerMode = "light" | "dark";

/** Blue-black ocean / space behind the globe canvas. */
export const OCEAN_COLOR = "#071525";
export const SPACE_COLOR = "#02060e";

/** Default basemap id (Esri World Imagery — free XYZ, no API key). */
export const DEFAULT_BASEMAP_ID = "satellite" as const;

/** Esri World Imagery — XYZ is `{z}/{y}/{x}` (row/column), not OSM `{z}/{x}/{y}`. */
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  'Tiles © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const PAPERS_ATTRIBUTION =
  '<a href="https://papers.reearth.land/" target="_blank" rel="noopener">Re:Earth Papers</a> · Natural Earth';

type BasemapBase = {
  label: string;
  mode: CaseLayerMode;
};

export type OutlineBasemapColors = {
  globeColor: string;
  landColor: string;
  strokeColor: string;
  graticuleColor: string;
};

export type BasemapEntry =
  | (BasemapBase & {
      kind: "native-raster";
      url: string;
      maxZoom: number;
      attribution: string;
    })
  | (BasemapBase & {
      kind: "outline";
      colors: OutlineBasemapColors;
      attribution: string;
    });

export const BASEMAPS = {
  satellite: {
    kind: "native-raster",
    label: "Satellite",
    mode: "dark",
    url: SATELLITE_URL,
    maxZoom: 19,
    attribution: SATELLITE_ATTRIBUTION,
  },
  light: {
    kind: "outline",
    label: "Light",
    mode: "light",
    colors: {
      // Near-white globe; land a clear step darker so continents read at a glance.
      globeColor: "#f4f4f5",
      landColor: "#d4d4d8",
      // Zinc-700 — contrasts on #f4f4f5 / #d4d4d8 (opaque non-draped strokes).
      strokeColor: "#3f3f46",
      graticuleColor: "#a1a1aa",
    },
    attribution: PAPERS_ATTRIBUTION,
  },
  dark: {
    kind: "outline",
    label: "Dark",
    mode: "dark",
    colors: {
      globeColor: "#0f172a",
      landColor: "#1e293b",
      // Slate-300 — readable on #0f172a / #1e293b under ambient light.
      strokeColor: "#cbd5e1",
      graticuleColor: "#64748b",
    },
    attribution: PAPERS_ATTRIBUTION,
  },
} as const satisfies Record<string, BasemapEntry>;

export type BasemapId = keyof typeof BASEMAPS;

/**
 * Legacy ids from OpenFreeMap / earlier Navara catalogs.
 * Persisted localStorage values resolve here so radios stay valid.
 */
const LEGACY_BASEMAP_IDS: Record<string, BasemapId> = {
  positron: "light",
  bright: "light",
  liberty: "light",
  "natural-earth": "light",
  "natural-earth-light": "light",
  fiord: "dark",
};

export function isBasemapId(value: string): value is BasemapId {
  return value in BASEMAPS;
}

export function resolveBasemapId(value: string | undefined): BasemapId {
  if (!value) return DEFAULT_BASEMAP_ID;
  if (isBasemapId(value)) return value;
  return LEGACY_BASEMAP_IDS[value] ?? DEFAULT_BASEMAP_ID;
}

/**
 * Sync UI theme → basemap when enabled.
 * Light UI → outline light; dark UI → outline dark (satellite is manual).
 */
export function basemapIdForUiTheme(
  resolvedTheme: string | undefined,
): BasemapId {
  return resolvedTheme === "dark" ? "dark" : "light";
}

/** Papers Natural Earth MVT endpoints (maxzoom 8). */
export const PAPERS_NE_PHYSICAL_URL =
  "https://papers.reearth.land/naturalearth_physical/{z}/{x}/{y}.mvt";
export const PAPERS_NE_ADMIN_URL =
  "https://papers.reearth.land/naturalearth_admin/{z}/{x}/{y}.mvt";
export const PAPERS_NE_MAX_ZOOM = 8;

type GraticuleFeature = {
  type: "Feature";
  properties: { kind: "meridian" | "parallel"; lon?: number; lat?: number };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

/**
 * 15° latitude/longitude grid as LineStrings.
 * Papers NE has no full graticule — only equator/tropics via geographic_lines.
 */
export function buildGraticuleGeoJSON(stepDeg = 15): {
  type: "FeatureCollection";
  features: GraticuleFeature[];
} {
  const features: GraticuleFeature[] = [];
  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const coords: [number, number][] = [];
    for (let lat = -90; lat <= 90; lat += stepDeg) {
      coords.push([lon, lat]);
    }
    features.push({
      type: "Feature",
      properties: { kind: "meridian", lon },
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += stepDeg) {
      coords.push([lon, lat]);
    }
    features.push({
      type: "Feature",
      properties: { kind: "parallel", lat },
      geometry: { type: "LineString", coordinates: coords },
    });
  }
  return { type: "FeatureCollection", features };
}
