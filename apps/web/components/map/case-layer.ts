import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapAggregate, MapCase } from "../../lib/data-types";

const CASES_SOURCE = "bdbv-cases";
const CASES_LAYER = "bdbv-cases-circle";
const AGG_SOURCE = "bdbv-aggregates";
const AGG_LAYER = "bdbv-aggregates-circle";

function casesGeoJson(cases: MapCase[]) {
  return {
    type: "FeatureCollection" as const,
    features: cases.map((c) => ({
      type: "Feature" as const,
      properties: {
        id: c.id,
        visual_id: c.visual_id,
        classification: c.classification,
        admin0_iso: c.admin0_iso,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [c.lon, c.lat],
      },
    })),
  };
}

function aggregatesGeoJson(aggregates: MapAggregate[]) {
  return {
    type: "FeatureCollection" as const,
    features: aggregates.map((a) => ({
      type: "Feature" as const,
      properties: {
        admin_iso: a.admin_iso,
        name: a.name,
        confirmed: a.confirmed,
        deaths: a.deaths,
        radius: Math.max(10, Math.min(40, Math.sqrt(a.confirmed) * 2.5)),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [a.lon, a.lat],
      },
    })),
  };
}

export type CaseLayerMode = "light" | "dark";

function casePaint(mode: CaseLayerMode) {
  const dark = mode === "dark";
  return {
    "circle-radius": 6,
    "circle-color": [
      "match",
      ["get", "classification"],
      "confirmed",
      dark ? "#f4f4f5" : "#18181b",
      "suspected",
      dark ? "#fbbf24" : "#d97706",
      dark ? "#a1a1aa" : "#71717a",
    ] as unknown as string,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": dark ? "#18181b" : "#fafafa",
  };
}

export function ensureCaseLayers(
  map: MapLibreMap,
  mode: CaseLayerMode = "light",
): void {
  if (!map.getSource(CASES_SOURCE)) {
    map.addSource(CASES_SOURCE, {
      type: "geojson",
      data: casesGeoJson([]),
    });
    map.addLayer({
      id: CASES_LAYER,
      type: "circle",
      source: CASES_SOURCE,
      paint: casePaint(mode),
    });
  }

  if (!map.getSource(AGG_SOURCE)) {
    map.addSource(AGG_SOURCE, {
      type: "geojson",
      data: aggregatesGeoJson([]),
    });
    map.addLayer({
      id: AGG_LAYER,
      type: "circle",
      source: AGG_SOURCE,
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": "#b91c1c",
        "circle-opacity": 0.35,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#7f1d1d",
      },
    });
  }
}

export function updateCaseLayers(
  map: MapLibreMap,
  cases: MapCase[],
  aggregates: MapAggregate[],
): void {
  const casesSrc = map.getSource(CASES_SOURCE) as
    | { setData: (d: unknown) => void }
    | undefined;
  const aggSrc = map.getSource(AGG_SOURCE) as
    | { setData: (d: unknown) => void }
    | undefined;
  casesSrc?.setData(casesGeoJson(cases));
  aggSrc?.setData(aggregatesGeoJson(aggregates));
}

export function setCaseLayersVisible(
  map: MapLibreMap,
  visible: boolean,
): void {
  const value = visible ? "visible" : "none";
  if (map.getLayer(CASES_LAYER)) {
    map.setLayoutProperty(CASES_LAYER, "visibility", value);
  }
  if (map.getLayer(AGG_LAYER)) {
    map.setLayoutProperty(AGG_LAYER, "visibility", value);
  }
}

export function onCaseClick(
  map: MapLibreMap,
  handler: (caseId: string) => void,
): () => void {
  const click = (e: { features?: { properties?: { id?: string } }[] }) => {
    const id = e.features?.[0]?.properties?.id;
    if (id) handler(id);
  };
  map.on("click", CASES_LAYER, click);
  map.on("mouseenter", CASES_LAYER, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", CASES_LAYER, () => {
    map.getCanvas().style.cursor = "";
  });
  return () => {
    map.off("click", CASES_LAYER, click);
  };
}
