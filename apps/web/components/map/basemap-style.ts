/**
 * Basemap catalog for Navara OutbreakMap.
 * - `native-raster`: XYZ raster tiles (satellite / Natural Earth) — fast path.
 * - `maplibre-style`: OpenFreeMap Style JSON via MapLibreStylePlugin.
 * Both always sit on ellipsoid terrain so the full globe remains visible.
 */

/** Case marker stroke/fill palette keyed off basemap. */
export type CaseLayerMode = "light" | "dark";

/** Blue-black ocean / space behind the globe canvas. */
export const OCEAN_COLOR = "#071525";
export const SPACE_COLOR = "#02060e";

/** Default basemap id (Esri World Imagery — free XYZ, no API key). */
export const DEFAULT_BASEMAP_ID = "satellite" as const;

const NE_URL =
  "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png";
const NE_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> Natural Earth · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** Esri World Imagery — XYZ is `{z}/{y}/{x}` (row/column), not OSM `{z}/{x}/{y}`. */
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  'Tiles © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

type BasemapBase = {
  label: string;
  mode: CaseLayerMode;
};

export type BasemapEntry =
  | (BasemapBase & {
      kind: "native-raster";
      url: string;
      maxZoom: number;
      attribution: string;
    })
  | (BasemapBase & {
      kind: "maplibre-style";
      styleUrl: string;
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
  "natural-earth": {
    kind: "native-raster",
    label: "Natural Earth",
    mode: "dark",
    url: NE_URL,
    maxZoom: 6,
    attribution: NE_ATTRIBUTION,
  },
  positron: {
    kind: "maplibre-style",
    label: "Positron",
    mode: "light",
    styleUrl: "https://tiles.openfreemap.org/styles/positron",
  },
  bright: {
    kind: "maplibre-style",
    label: "Bright",
    mode: "light",
    styleUrl: "https://tiles.openfreemap.org/styles/bright",
  },
  liberty: {
    kind: "maplibre-style",
    label: "Liberty",
    mode: "light",
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  },
  dark: {
    kind: "maplibre-style",
    label: "Dark",
    mode: "dark",
    styleUrl: "https://tiles.openfreemap.org/styles/dark",
  },
  fiord: {
    kind: "maplibre-style",
    label: "Fiord",
    mode: "dark",
    styleUrl: "https://tiles.openfreemap.org/styles/fiord",
  },
} as const satisfies Record<string, BasemapEntry>;

export type BasemapId = keyof typeof BASEMAPS;

/** Legacy ids persisted before the Navara migration / satellite default. */
const LEGACY_BASEMAP_IDS: Record<string, BasemapId> = {
  "natural-earth-light": "natural-earth",
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
 * Light stays on satellite (default product look); dark picks OFM Dark.
 */
export function basemapIdForUiTheme(
  resolvedTheme: string | undefined,
): BasemapId {
  return resolvedTheme === "dark" ? "dark" : DEFAULT_BASEMAP_ID;
}
