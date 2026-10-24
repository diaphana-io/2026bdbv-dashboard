import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapExposure } from "../../lib/data-types";

const SOURCE = "bdbv-exposures";
const LAYER = "bdbv-exposures-circle";

function exposuresGeoJson(exposures: MapExposure[]) {
  const byCase = new Map<
    string,
    { id: string; visual_id: string; lat: number; lon: number; count: number }
  >();
  for (const e of exposures) {
    if (e.to_lat == null || e.to_lon == null || !e.to_case_id) continue;
    const prev = byCase.get(e.to_case_id);
    if (prev) {
      prev.count += 1;
    } else {
      byCase.set(e.to_case_id, {
        id: e.to_case_id,
        visual_id: e.to_case_visual_id,
        lat: e.to_lat,
        lon: e.to_lon,
        count: 1,
      });
    }
  }
  return {
    type: "FeatureCollection" as const,
    features: [...byCase.values()].map((row) => ({
      type: "Feature" as const,
      properties: {
        id: row.id,
        visual_id: row.visual_id,
        count: row.count,
        radius: Math.max(10, Math.min(28, 8 + row.count * 4)),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [row.lon, row.lat],
      },
    })),
  };
}

export function ensureExposureLayer(map: MapLibreMap): void {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, {
    type: "geojson",
    data: exposuresGeoJson([]),
  });
  map.addLayer({
    id: LAYER,
    type: "circle",
    source: SOURCE,
    paint: {
      "circle-radius": ["get", "radius"],
      "circle-color": "#2563eb",
      "circle-opacity": 0.18,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#1d4ed8",
      "circle-stroke-opacity": 0.55,
    },
  });
}

export function updateExposureLayer(
  map: MapLibreMap,
  exposures: MapExposure[],
): void {
  const src = map.getSource(SOURCE) as
    | { setData: (d: unknown) => void }
    | undefined;
  src?.setData(exposuresGeoJson(exposures));
}

export function setExposureLayerVisible(
  map: MapLibreMap,
  visible: boolean,
): void {
  if (!map.getLayer(LAYER)) return;
  map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
}
