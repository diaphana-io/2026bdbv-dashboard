/**
 * Basemap catalog for Navara OutbreakMap.
 * Dark/Light = Pax Atlas stack: photoreal + Re:Earth terrain + Papers NE
 * (TileJsonPlugin). Only Dark is selectable; Light stays in the catalog for
 * a disabled sidebar radio. Satellite / local outline GeoJSON are retired.
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

/** Basemap ids that may be selected in the UI. Light stays catalogued only. */
export const AVAILABLE_BASEMAP_IDS = [
  "dark",
] as const satisfies readonly BasemapId[];

/**
 * Legacy ids from OpenFreeMap / satellite / earlier Navara catalogs.
 * Persisted localStorage values resolve here so radios stay valid.
 * All paths collapse to Dark (Light is catalog-only / disabled).
 */
const LEGACY_BASEMAP_IDS: Record<string, BasemapId> = {
  satellite: "dark",
  outline: "dark",
  positron: "dark",
  bright: "dark",
  liberty: "dark",
  "natural-earth": "dark",
  "natural-earth-light": "dark",
  fiord: "dark",
  light: "dark",
};

export function isBasemapId(value: string): value is BasemapId {
  return value in BASEMAPS;
}

export function isBasemapSelectable(id: BasemapId): boolean {
  return (AVAILABLE_BASEMAP_IDS as readonly string[]).includes(id);
}

export function resolveBasemapId(value: string | undefined): BasemapId {
  if (!value) return DEFAULT_BASEMAP_ID;
  if (isBasemapId(value) && isBasemapSelectable(value)) return value;
  if (isBasemapId(value)) return DEFAULT_BASEMAP_ID;
  return LEGACY_BASEMAP_IDS[value] ?? DEFAULT_BASEMAP_ID;
}

/**
 * Theme → basemap sync. Dark-only: always returns dark regardless of UI theme.
 */
export function basemapIdForUiTheme(
  _resolvedTheme: string | undefined,
): BasemapId {
  return DEFAULT_BASEMAP_ID;
}
