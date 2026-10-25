/**
 * Basemap catalog for Navara OutbreakMap.
 * Dark/Light = Pax Atlas stack: photoreal + Re:Earth terrain + Papers NE
 * (TileJsonPlugin). Satellite / local outline GeoJSON are retired.
 */

/** Case marker stroke/fill palette keyed off basemap. */
export type CaseLayerMode = "light" | "dark";

/** Space behind the globe canvas (photoreal sky fills most of the view). */
export const SPACE_COLOR = "#02060e";

/** Papers Natural Earth admin TileJSON (key-free Re:Earth Papers). */
export const PAPERS_NE_TILEJSON_URL =
  "https://papers.reearth.land/naturalearth_admin/tilejson.json";

/** Re:Earth quantized-mesh terrain (normals + water mask). */
export const REEARTH_TERRAIN_URL =
  "https://terrain.reearth.land/cesium-mesh/ellipsoid/{z}/{x}/{y}.terrain";

/** Default basemap id — Pax-style dark Papers NE. */
export const DEFAULT_BASEMAP_ID = "dark" as const;

export type PapersBasemapColors = {
  /** Globe / ocean colour (land polygons leave seas as globe.color). */
  ocean: string;
  land: string;
  landOpacity: number;
  border: string;
  borderOpacity: number;
  borderWidth: number;
};

type BasemapBase = {
  label: string;
  mode: CaseLayerMode;
};

export type BasemapEntry = BasemapBase & {
  kind: "papers";
  colors: PapersBasemapColors;
  /** Tone mapping exposure after addDefaultPhotorealScene (Pax dark ≈ 1.2). */
  toneMappingExposure: number;
};

export const BASEMAPS = {
  dark: {
    kind: "papers",
    label: "Dark",
    mode: "dark",
    colors: {
      ocean: "#232425",
      land: "#090909",
      landOpacity: 0.85,
      border: "#555555",
      borderOpacity: 0.5,
      borderWidth: 1.5,
    },
    toneMappingExposure: 1.2,
  },
  light: {
    kind: "papers",
    label: "Light",
    mode: "light",
    colors: {
      ocean: "#d7dde3",
      land: "#f4f4f5",
      landOpacity: 0.9,
      border: "#737373",
      borderOpacity: 0.55,
      borderWidth: 1.5,
    },
    toneMappingExposure: 1.45,
  },
} as const satisfies Record<string, BasemapEntry>;

export type BasemapId = keyof typeof BASEMAPS;

/**
 * Legacy ids from OpenFreeMap / satellite / earlier Navara catalogs.
 * Persisted localStorage values resolve here so radios stay valid.
 */
const LEGACY_BASEMAP_IDS: Record<string, BasemapId> = {
  satellite: "dark",
  outline: "dark",
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
 * Light UI → Papers light; dark UI → Papers dark.
 */
export function basemapIdForUiTheme(
  resolvedTheme: string | undefined,
): BasemapId {
  return resolvedTheme === "dark" ? "dark" : "light";
}
