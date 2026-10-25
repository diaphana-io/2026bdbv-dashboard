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

const COLOR_BY_ISO: Record<string, string> = Object.fromEntries(
  TRACKED_COUNTRIES.map((c) => [c.iso, c.color]),
);

function colorForIso(iso: unknown): Color {
  const hex =
    typeof iso === "string" ? COLOR_BY_ISO[iso] : undefined;
  return new Color().setStyle(hex ?? "#64748b");
}

/**
 * Tracked-country fill + thin emphasis outline only.
 * World borders come from Papers NE `boundary_lines` (no local double-stroke).
 *
 * Outline is non-draped: draped polylines vanish at the Africa / globe-scale
 * camera; non-draped strokes stay visible (lit — OutbreakMap ambient covers it).
 */
export function attachBoundaryLayer(
  view: View,
  _mode: CaseLayerMode = "dark",
): BoundaryLayerHandle {
  const trackedSource = view.addSource({
    type: "geojson",
    data: boundaries,
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
      geometryTypes: ["line", "polygon"],
      color: new Color().setStyle("#64748b"),
      // Pax-thin emphasis over Papers world borders.
      width: 2,
      maxWidth: 80_000,
      opacity: 0.9,
      transparent: true,
      clampToGround: false,
      height: 4_000,
      show: true,
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

  const layers: Layer[] = [fill, outline];
  const sources: Source[] = [trackedSource];

  return {
    setVisible(next) {
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
