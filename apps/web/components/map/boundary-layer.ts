import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import boundariesData from "../../data/country_boundaries.json";

const SOURCE = "bdbv-boundaries";
const FILL = "bdbv-boundaries-fill";
const LINE = "bdbv-boundaries-line";

const boundaries = boundariesData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { admin0_iso: string; name: string };
    geometry: { type: string; coordinates: unknown };
  }>;
};

function countryColorMatch(): ExpressionSpecification {
  const match: ExpressionSpecification = ["match", ["get", "admin0_iso"]];
  for (const c of TRACKED_COUNTRIES) {
    match.push(c.iso, c.color);
  }
  match.push("#64748b");
  return match;
}

export function ensureBoundaryLayer(map: MapLibreMap): void {
  if (!map.getSource(SOURCE)) {
    map.addSource(SOURCE, {
      type: "geojson",
      data: boundaries,
    });
  }
  const color = countryColorMatch();
  if (!map.getLayer(FILL)) {
    map.addLayer({
      id: FILL,
      type: "fill",
      source: SOURCE,
      paint: {
        "fill-color": color,
        "fill-opacity": 0.1,
      },
    });
  }
  if (!map.getLayer(LINE)) {
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      paint: {
        "line-color": color,
        "line-width": 1.5,
        "line-opacity": 0.9,
      },
    });
  }
}

export function setBoundaryLayerVisible(
  map: MapLibreMap,
  visible: boolean,
): void {
  const value = visible ? "visible" : "none";
  if (map.getLayer(FILL)) {
    map.setLayoutProperty(FILL, "visibility", value);
  }
  if (map.getLayer(LINE)) {
    map.setLayoutProperty(LINE, "visibility", value);
  }
}
