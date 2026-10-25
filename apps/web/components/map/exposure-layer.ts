import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { MapExposure } from "../../lib/data-types";

type View = ThreeView<DefaultDescriptions>;

export type ExposureLayerHandle = {
  update: (exposures: MapExposure[]) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

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
        kind: "exposure",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [row.lon, row.lat],
      },
    })),
  };
}

function wireSizes(layer: Layer) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => ({
        size: (properties?.["radius"] as number) ?? 12,
        show: true,
      }),
      { filters: ["radius"] },
    );
  });
}

export function attachExposureLayer(view: View): ExposureLayerHandle {
  let visible = true;
  let source: Source | undefined;
  let layer: Layer | undefined;
  let last: MapExposure[] = [];

  function clear() {
    layer?.delete();
    source?.delete();
    layer = source = undefined;
  }

  function rebuild(exposures: MapExposure[]) {
    clear();
    if (!visible) return;
    source = view.addSource({
      type: "geojson",
      data: exposuresGeoJson(exposures),
    });
    layer = view.addLayer({
      type: "vector",
      source,
      point: {
        color: new Color().setStyle("#2563eb"),
        size: 12,
        sizeInMeters: false,
        opacity: 0.35,
        clampToGround: true,
        declutter: false,
      },
    });
    wireSizes(layer);
  }

  return {
    update(exposures) {
      last = exposures;
      rebuild(exposures);
    },
    setVisible(next) {
      if (visible === next) return;
      visible = next;
      rebuild(last);
    },
    destroy() {
      clear();
    },
  };
}
