import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { MapAggregate, MapCase } from "../../lib/data-types";
import type { CaseLayerMode } from "./basemap-style";
import type { BoundaryLevel } from "./map-ui-context";
import {
  buildStatsDots,
  STATS_DOT_COLORS,
  statsDotsGeoJson,
  type StatsDotStatus,
} from "./stats-dot-scatter";

type View = ThreeView<DefaultDescriptions>;

export type { CaseLayerMode };

export type CaseLayersHandle = {
  update: (cases: MapCase[], aggregates: MapAggregate[]) => void;
  setCasesVisible: (visible: boolean) => void;
  setClaimsVisible: (visible: boolean) => void;
  setBoundaryLevel: (level: BoundaryLevel) => void;
  setAsOf: (asOf: string) => void;
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

function wireStatsDotColors(layer: Layer) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => {
        const status = properties?.["status"] as StatsDotStatus | undefined;
        const hex =
          status && STATS_DOT_COLORS[status]
            ? STATS_DOT_COLORS[status]
            : STATS_DOT_COLORS.confirmed;
        return {
          color: new Color().setStyle(hex),
          show: true,
        };
      },
      { filters: ["status"] },
    );
  });
}

/**
 * Case points + Case Stats 1px dots (replaces aggregate bubbles).
 * Dynamic GeoJSON must delete+recreate (skill invariant).
 */
export function attachCaseLayers(
  view: View,
  mode: CaseLayerMode = "light",
): CaseLayersHandle {
  let modeState = mode;
  let casesVisible = true;
  let claimsVisible = true;
  let boundaryLevel: BoundaryLevel = "auto";
  let asOf = "";
  let casesSource: Source | undefined;
  let casesLayer: Layer | undefined;
  let dotsSource: Source | undefined;
  let dotsLayer: Layer | undefined;

  function clear() {
    casesLayer?.delete();
    casesSource?.delete();
    dotsLayer?.delete();
    dotsSource?.delete();
    casesLayer = casesSource = dotsLayer = dotsSource = undefined;
  }

  function rebuild(cases: MapCase[], aggregates: MapAggregate[]) {
    clear();

    if (casesVisible) {
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
    }

    if (claimsVisible) {
      const dots = buildStatsDots(aggregates, asOf || "0", boundaryLevel);
      dotsSource = view.addSource({
        type: "geojson",
        data: statsDotsGeoJson(dots),
      });
      dotsLayer = view.addLayer({
        type: "vector",
        source: dotsSource,
        point: {
          color: new Color().setStyle(STATS_DOT_COLORS.confirmed),
          size: 1,
          sizeInMeters: false,
          opacity: 0.95,
          clampToGround: true,
          declutter: false,
        },
      });
      wireStatsDotColors(dotsLayer);
    }
  }

  let lastCases: MapCase[] = [];
  let lastAggregates: MapAggregate[] = [];

  return {
    update(cases, aggregates) {
      lastCases = cases;
      lastAggregates = aggregates;
      rebuild(cases, aggregates);
    },
    setCasesVisible(next) {
      if (casesVisible === next) return;
      casesVisible = next;
      rebuild(lastCases, lastAggregates);
    },
    setClaimsVisible(next) {
      if (claimsVisible === next) return;
      claimsVisible = next;
      rebuild(lastCases, lastAggregates);
    },
    setBoundaryLevel(level) {
      if (boundaryLevel === level) return;
      boundaryLevel = level;
      rebuild(lastCases, lastAggregates);
    },
    setAsOf(next) {
      if (asOf === next) return;
      asOf = next;
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
