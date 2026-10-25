import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import type { CaseLayerMode } from "./basemap-style";
import boundariesData from "../../data/country_boundaries.json";
import worldBoundariesData from "../../data/world_boundaries.json";

type View = ThreeView<DefaultDescriptions>;

export type BoundaryLayerHandle = {
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

const boundaries = boundariesData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { admin0_iso: string; name: string };
    geometry: { type: string; coordinates: unknown };
  }>;
};

const worldBoundaries = worldBoundariesData as {
  type: "FeatureCollection";
  features: unknown[];
};

const COLOR_BY_ISO: Record<string, string> = Object.fromEntries(
  TRACKED_COUNTRIES.map((c) => [c.iso, c.color]),
);

function colorForIso(iso: unknown): Color {
  const hex =
    typeof iso === "string" ? COLOR_BY_ISO[iso] : undefined;
  return new Color().setStyle(hex ?? "#64748b");
}

/** World outline stroke — dark on light basemap, white on dark/satellite imagery. */
function worldStrokeColor(mode: CaseLayerMode): string {
  // Pure white reads on Esri imagery; slate-200 was too soft after mode-aware cutover.
  return mode === "light" ? "#3f3f46" : "#ffffff";
}

/** Shared stroke style for globe-scale views (non-draped, lit). */
function worldStroke(mode: CaseLayerMode) {
  return {
    geometryTypes: ["line", "polygon"] as Array<"line" | "polygon">,
    color: new Color().setStyle(worldStrokeColor(mode)),
    width: 3.5,
    // World meters — without this, default 1000 m makes strokes sub-pixel
    // from the Africa / globe camera (1 px ≈ 10+ km).
    maxWidth: 400_000,
    opacity: 1,
    transparent: false,
    clampToGround: false,
    // Lift slightly so thin strokes don't z-fight the ellipsoid raster.
    height: 5_000,
    show: true,
  };
}

/**
 * Static boundary GeoJSON — create once (not time-varying).
 * World outlines + tracked-country fills/strokes.
 *
 * Polylines use clampToGround:false — draped lines vanish at Africa /
 * globe-scale camera heights in Navara. Non-draped strokes are lit; OutbreakMap
 * adds ambient light so they are not black on satellite.
 */
export function attachBoundaryLayer(
  view: View,
  mode: CaseLayerMode = "dark",
): BoundaryLayerHandle {
  const stroke = worldStroke(mode);
  const worldSource = view.addSource({
    type: "geojson",
    data: worldBoundaries as GeoJSON.FeatureCollection,
  });
  const worldLine = view.addLayer({
    type: "vector",
    source: worldSource,
    polyline: { ...stroke },
  });

  const trackedSource = view.addSource({
    type: "geojson",
    data: boundaries as GeoJSON.FeatureCollection,
  });
  const fill = view.addLayer({
    type: "vector",
    source: trackedSource,
    polygon: {
      color: new Color().setStyle("#64748b"),
      opacity: 0.14,
      transparent: true,
      clampToGround: true,
      show: true,
    },
  });
  fill.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => ({
        color: colorForIso(properties?.["admin0_iso"]),
        show: true,
      }),
      { filters: ["admin0_iso"] },
    );
  });

  const outline = view.addLayer({
    type: "vector",
    source: trackedSource,
    polyline: {
      ...stroke,
      width: 4.5,
      height: 8_000,
      color: new Color().setStyle(worldStrokeColor(mode)),
    },
  });
  outline.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => ({
        color: colorForIso(properties?.["admin0_iso"]),
        show: true,
      }),
      { filters: ["admin0_iso"] },
    );
  });

  const layers: Layer[] = [worldLine, fill, outline];
  const sources: Source[] = [worldSource, trackedSource];

  return {
    setVisible(next) {
      // Always re-assert show — early-return skipped updates when Navara
      // feature evaluators left material visibility out of sync on satellite.
      for (const layer of layers) {
        layer.update({
          polygon: { show: next },
          polyline: { show: next },
        });
      }
    },
    destroy() {
      for (const layer of layers) layer.delete();
      for (const source of sources) source.delete();
    },
  };
}
