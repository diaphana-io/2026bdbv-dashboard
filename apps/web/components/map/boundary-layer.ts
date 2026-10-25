import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
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

/**
 * Static boundary GeoJSON — create once (not time-varying).
 * World outlines + tracked-country fills/strokes.
 *
 * Polylines use clampToGround:false — draped lines vanish at Africa /
 * globe-scale camera heights in Navara; non-draped lines need ambient light
 * (added in OutbreakMap).
 */
export function attachBoundaryLayer(view: View): BoundaryLayerHandle {
  const worldSource = view.addSource({
    type: "geojson",
    data: worldBoundaries as GeoJSON.FeatureCollection,
  });
  const worldLine = view.addLayer({
    type: "vector",
    source: worldSource,
    polyline: {
      geometryTypes: ["line", "polygon"],
      color: new Color().setStyle("#e2e8f0"),
      width: 0.9,
      maxWidth: 100_000,
      opacity: 0.85,
      clampToGround: false,
    },
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
      opacity: 0.12,
      clampToGround: true,
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
      geometryTypes: ["line", "polygon"],
      color: new Color().setStyle("#f8fafc"),
      width: 1.75,
      maxWidth: 100_000,
      opacity: 0.95,
      clampToGround: false,
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
  let visible = true;

  return {
    setVisible(next) {
      if (visible === next) return;
      visible = next;
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
