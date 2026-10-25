/**
 * Basemap catalog for Navara OutbreakMap.
 * - `native-raster`: fast Natural Earth XYZ (default first paint).
 * - `maplibre-style`: OpenFreeMap Style JSON via MapLibreStylePlugin.
 * Both always sit on ellipsoid terrain so the full globe remains visible.
 */

/** Case marker stroke/fill palette keyed off basemap. */
export type CaseLayerMode = "light" | "dark";

/** Blue-black ocean / space behind the globe canvas. */
export const OCEAN_COLOR = "#071525";
export const SPACE_COLOR = "#02060e";

const NE_URL =
  "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png";
const NE_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> Natural Earth · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

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

/** Legacy ids persisted before the Navara migration. */
const LEGACY_BASEMAP_IDS: Record<string, BasemapId> = {
  "natural-earth-light": "natural-earth",
};

export function isBasemapId(value: string): value is BasemapId {
  return value in BASEMAPS;
}

export function resolveBasemapId(value: string | undefined): BasemapId {
  if (!value) return "natural-earth";
  if (isBasemapId(value)) return value;
  return LEGACY_BASEMAP_IDS[value] ?? "natural-earth";
}

/** Sync UI theme → basemap; keep Natural Earth as the fast default for light. */
export function basemapIdForUiTheme(
  resolvedTheme: string | undefined,
): BasemapId {
  return resolvedTheme === "dark" ? "dark" : "natural-earth";
}
