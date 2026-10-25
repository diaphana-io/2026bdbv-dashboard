import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { MapAggregate, MapCase } from "../../lib/data-types";
import type { CaseLayerMode } from "./basemap-style";

type View = ThreeView<DefaultDescriptions>;

export type { CaseLayerMode };

export type CaseLayersHandle = {
  update: (cases: MapCase[], aggregates: MapAggregate[]) => void;
  setVisible: (visible: boolean) => void;
  setMode: (mode: CaseLayerMode) => void;
  destroy: () => void;
};

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
        kind: "case",
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
        kind: "aggregate",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [a.lon, a.lat],
      },
    })),
  };
}

function caseColor(classification: unknown, mode: CaseLayerMode): Color {
  const dark = mode === "dark";
  if (classification === "confirmed") {
    return new Color().setStyle(dark ? "#f4f4f5" : "#18181b");
  }
  if (classification === "suspected") {
    return new Color().setStyle(dark ? "#fbbf24" : "#d97706");
  }
  return new Color().setStyle(dark ? "#a1a1aa" : "#71717a");
}

function wireCaseColors(layer: Layer, mode: CaseLayerMode) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => ({
        color: caseColor(properties?.["classification"], mode),
        show: true,
      }),
      { filters: ["classification"] },
    );
  });
}

function wireAggregateSizes(layer: Layer) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => ({
        size: (properties?.["radius"] as number) ?? 14,
        show: true,
      }),
      { filters: ["radius"] },
    );
  });
}

/**
 * Declarative case + aggregate point layers.
 * Dynamic GeoJSON must delete+recreate (skill invariant).
 */
export function attachCaseLayers(
  view: View,
  mode: CaseLayerMode = "light",
): CaseLayersHandle {
  let modeState = mode;
  let visible = true;
  let casesSource: Source | undefined;
  let casesLayer: Layer | undefined;
  let aggSource: Source | undefined;
  let aggLayer: Layer | undefined;

  function clear() {
    casesLayer?.delete();
    casesSource?.delete();
    aggLayer?.delete();
    aggSource?.delete();
    casesLayer = casesSource = aggLayer = aggSource = undefined;
  }

  function rebuild(cases: MapCase[], aggregates: MapAggregate[]) {
    clear();
    if (!visible) return;

    casesSource = view.addSource({
      type: "geojson",
      data: casesGeoJson(cases),
    });
    casesLayer = view.addLayer({
      type: "vector",
      source: casesSource,
      point: {
        color: caseColor("confirmed", modeState),
        size: 6,
        sizeInMeters: false,
        clampToGround: true,
        declutter: false,
      },
    });
    wireCaseColors(casesLayer, modeState);

    aggSource = view.addSource({
      type: "geojson",
      data: aggregatesGeoJson(aggregates),
    });
    aggLayer = view.addLayer({
      type: "vector",
      source: aggSource,
      point: {
        color: new Color().setStyle("#b91c1c"),
        size: 14,
        sizeInMeters: false,
        opacity: 0.35,
        clampToGround: true,
        declutter: false,
      },
    });
    wireAggregateSizes(aggLayer);
  }

  let lastCases: MapCase[] = [];
  let lastAggregates: MapAggregate[] = [];

  return {
    update(cases, aggregates) {
      lastCases = cases;
      lastAggregates = aggregates;
      rebuild(cases, aggregates);
    },
    setVisible(next) {
      if (visible === next) return;
      visible = next;
      rebuild(lastCases, lastAggregates);
    },
    setMode(next) {
      if (modeState === next) return;
      modeState = next;
      rebuild(lastCases, lastAggregates);
    },
    destroy() {
      clear();
    },
  };
}
