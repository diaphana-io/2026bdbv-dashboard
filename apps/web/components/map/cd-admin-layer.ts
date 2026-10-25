import {
  Color,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { MapAggregate } from "../../lib/data-types";
import provincesData from "../../data/cd_provinces.json";
import territoriesData from "../../data/cd_territories.json";
import healthZonesData from "../../data/cd_health_zones.json";

type View = ThreeView<DefaultDescriptions>;

export type CdAdminLayerHandle = {
  setVisible: (visible: boolean) => void;
  setAggregates: (aggregates: MapAggregate[]) => void;
  destroy: () => void;
};

type LodBand = "far" | "mid" | "near";

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

/** Camera-height bands (meters). Africa overview ≈ 6_800_000 m. */
const FAR_MIN_HEIGHT = 4_000_000;
const MID_MIN_HEIGHT = 1_200_000;

const LINE = {
  province: {
    color: "#94a3b8",
    width: 2.5,
    maxWidth: 120_000,
    height: 5_000,
    opacity: 0.95,
  },
  territory: {
    color: "#64748b",
    width: 1.5,
    maxWidth: 80_000,
    height: 4_000,
    opacity: 0.85,
  },
  healthZone: {
    color: "#475569",
    width: 1,
    maxWidth: 40_000,
    height: 3_000,
    opacity: 0.8,
  },
} as const;

const COD_AB_ATTRIBUTION = {
  attribution: "© OCHA COD-AB",
  attributionUrl: "https://data.humdata.org/dataset/cod-ab-cod",
};

const provinces = provincesData as FeatureCollection;
const territories = territoriesData as FeatureCollection;
const healthZones = healthZonesData as FeatureCollection;

function bandForHeight(height: number): LodBand {
  if (height >= FAR_MIN_HEIGHT) return "far";
  if (height >= MID_MIN_HEIGHT) return "mid";
  return "near";
}

function choroplethColor(confirmed: number, maxConfirmed: number): Color {
  if (confirmed <= 0 || maxConfirmed <= 0) {
    return new Color().setStyle("#64748b");
  }
  const t = Math.min(1, Math.sqrt(confirmed / maxConfirmed));
  const r = Math.round(15 + t * (245 - 15));
  const g = Math.round(23 + t * (158 - 23));
  const b = Math.round(42 + t * (11 - 42));
  return new Color().setRGB(r / 255, g / 255, b / 255);
}

function outlineLayer(
  view: View,
  source: Source,
  style: (typeof LINE)[keyof typeof LINE],
  show: boolean,
): Layer {
  return view.addLayer({
    type: "vector",
    source,
    polyline: {
      geometryTypes: ["line", "polygon"],
      color: new Color().setStyle(style.color),
      width: style.width,
      maxWidth: style.maxWidth,
      opacity: style.opacity,
      transparent: true,
      clampToGround: false,
      height: style.height,
      show,
    },
  });
}

function hzFillCollection(
  confirmedByPcode: Map<string, number>,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: healthZones.features.map((f) => {
      const pcode =
        typeof f.properties?.["adm3_pcode"] === "string"
          ? f.properties["adm3_pcode"]
          : "";
      const confirmed = confirmedByPcode.get(pcode) ?? 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          confirmed,
        },
      };
    }),
  };
}

/**
 * DRC COD-AB province / territory / health-zone outlines with camera-height LOD.
 * Near band may fill health zones from existing MapSnapshot.aggregates
 * (`admin_iso` ↔ `adm3_pcode`). Country-total `admin_iso: "CD"` does not match
 * any HZ — provisional fill-less state until zone-level aggregates exist.
 */
export function attachCdAdminLayer(view: View): CdAdminLayerHandle {
  view.attribution?.add([COD_AB_ATTRIBUTION]);

  const provinceSource = view.addSource({
    type: "geojson",
    data: provinces,
  });
  const territorySource = view.addSource({
    type: "geojson",
    data: territories,
  });
  const hzOutlineSource = view.addSource({
    type: "geojson",
    data: healthZones,
  });
  let hzFillSource = view.addSource({
    type: "geojson",
    data: hzFillCollection(new Map()),
  });

  let hzFill = view.addLayer({
    type: "vector",
    source: hzFillSource,
    polygon: {
      color: new Color().setStyle("#64748b"),
      opacity: 0.45,
      transparent: true,
      clampToGround: true,
      show: false,
    },
  });

  let provinceOutline = outlineLayer(
    view,
    provinceSource,
    LINE.province,
    true,
  );
  let territoryOutline = outlineLayer(
    view,
    territorySource,
    LINE.territory,
    false,
  );
  let hzOutline = outlineLayer(view, hzOutlineSource, LINE.healthZone, false);

  let maxConfirmed = 0;
  let visible = true;
  let band: LodBand = "far";
  let hasHzClaims = false;

  function wireHzFillColors(layer: Layer) {
    layer.on("featureUpdated", ({ evaluator }) => {
      evaluator.evaluate(
        ({ properties }) => {
          const confirmed =
            typeof properties?.["confirmed"] === "number"
              ? properties["confirmed"]
              : 0;
          const has = confirmed > 0;
          return {
            color: choroplethColor(confirmed, maxConfirmed),
            opacity: has ? 0.45 : 0,
            show: has,
          };
        },
        { filters: ["confirmed"] },
      );
    });
  }
  wireHzFillColors(hzFill);

  function applyLod(next: LodBand) {
    band = next;
    if (!visible) {
      provinceOutline.update({ polyline: { show: false } });
      territoryOutline.update({ polyline: { show: false } });
      hzOutline.update({ polyline: { show: false } });
      hzFill.update({ polygon: { show: false } });
      return;
    }
    if (next === "far") {
      provinceOutline.update({
        polyline: { show: true, width: LINE.province.width },
      });
      territoryOutline.update({ polyline: { show: false } });
      hzOutline.update({ polyline: { show: false } });
      hzFill.update({ polygon: { show: false } });
      return;
    }
    if (next === "mid") {
      provinceOutline.update({
        polyline: { show: true, width: LINE.province.width + 0.5 },
      });
      territoryOutline.update({ polyline: { show: true } });
      hzOutline.update({ polyline: { show: false } });
      hzFill.update({ polygon: { show: false } });
      return;
    }
    provinceOutline.update({ polyline: { show: false } });
    territoryOutline.update({
      polyline: { show: true, width: Math.max(1, LINE.territory.width - 0.4) },
    });
    hzOutline.update({ polyline: { show: true } });
    hzFill.update({ polygon: { show: hasHzClaims } });
  }

  function syncFromCamera() {
    try {
      const height = view.camera.positionGeographic.height;
      const next = bandForHeight(height);
      if (next !== band) applyLod(next);
    } catch {
      /* camera may be disposed during teardown */
    }
  }

  applyLod(bandForHeight(view.camera.positionGeographic.height));
  const onMove = () => syncFromCamera();
  view.camera.on("move", onMove);

  return {
    setVisible(next) {
      visible = next;
      applyLod(band);
    },
    setAggregates(aggregates) {
      const confirmedByPcode = new Map<string, number>();
      maxConfirmed = 0;
      for (const a of aggregates) {
        if (!a.admin_iso || a.admin_iso === "CD") continue;
        if (a.confirmed <= 0) continue;
        confirmedByPcode.set(a.admin_iso, a.confirmed);
        if (a.confirmed > maxConfirmed) maxConfirmed = a.confirmed;
      }
      hasHzClaims = confirmedByPcode.size > 0;

      if (!hasHzClaims) {
        hzFill.update({ polygon: { show: false } });
        return;
      }

      // Dynamic GeoJSON: delete+recreate fill under fresh outlines.
      hzFill.delete();
      hzFillSource.delete();
      provinceOutline.delete();
      territoryOutline.delete();
      hzOutline.delete();

      hzFillSource = view.addSource({
        type: "geojson",
        data: hzFillCollection(confirmedByPcode),
      });
      hzFill = view.addLayer({
        type: "vector",
        source: hzFillSource,
        polygon: {
          color: new Color().setStyle("#64748b"),
          opacity: 0.45,
          transparent: true,
          clampToGround: true,
          show: false,
        },
      });
      wireHzFillColors(hzFill);

      provinceOutline = outlineLayer(
        view,
        provinceSource,
        LINE.province,
        false,
      );
      territoryOutline = outlineLayer(
        view,
        territorySource,
        LINE.territory,
        false,
      );
      hzOutline = outlineLayer(view, hzOutlineSource, LINE.healthZone, false);
      applyLod(band);
    },
    destroy() {
      view.camera.off("move", onMove);
      view.attribution?.remove([COD_AB_ATTRIBUTION]);
      hzFill.delete();
      hzFillSource.delete();
      provinceOutline.delete();
      territoryOutline.delete();
      hzOutline.delete();
      provinceSource.delete();
      territorySource.delete();
      hzOutlineSource.delete();
    },
  };
}
