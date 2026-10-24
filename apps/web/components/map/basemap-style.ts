import type { CaseLayerMode } from "./case-layer";

/**
 * Thin free basemap: Natural Earth shaded relief (raster, maxzoom 6, overzooms).
 * Avoids full OpenFreeMap Positron vector PBFs (roads/labels) that stall first paint.
 * See https://github.com/diaphana-io/2026bdbv-dashboard/issues/5
 */
export function thinBasemapStyle(mode: CaseLayerMode) {
  const dark = mode === "dark";
  return {
    version: 8 as const,
    sources: {
      ne2: {
        type: "raster" as const,
        tiles: [
          "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 6,
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> Natural Earth · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: {
          "background-color": dark ? "#0b1220" : "#e8eef2",
        },
      },
      {
        id: "ne2",
        type: "raster" as const,
        source: "ne2",
        paint: dark
          ? {
              "raster-opacity": 0.72,
              "raster-saturation": -0.45,
              "raster-brightness-min": 0,
              "raster-brightness-max": 0.55,
            }
          : {
              "raster-opacity": 1,
            },
      },
    ],
  };
}
