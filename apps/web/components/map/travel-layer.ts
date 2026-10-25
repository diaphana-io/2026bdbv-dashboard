import {
  Color,
  EllipsoidGeodesic,
  geodeticToVector3,
  type MeshHandle,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type {
  SphereMeshDesc,
  TubeMeshDesc,
} from "@navaramap/three-default-descs";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import type { MapTravel } from "../../lib/data-types";

type View = ThreeView<DefaultDescriptions>;

type ArcState = {
  id: string;
  caseId?: string | null;
  departed: string;
  arrived: string;
  tube: MeshHandle;
  marker: MeshHandle;
  midPoints: Array<{ lat: number; lng: number; height: number }>;
};

const TUBE_RADIUS_M = 12_000;
const MARKER_RADIUS_M = 40_000;
const ARC_LIFT_M = 80_000;

function progressAt(asOf: string, departed: string, arrived: string): number {
  if (asOf < departed) return -1;
  if (asOf >= arrived) return 1;
  const a = Date.parse(departed);
  const b = Date.parse(arrived);
  const t = Date.parse(asOf);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

export type TravelLayerHandle = {
  setTravels: (travels: MapTravel[], asOf: string) => void;
  setHighlightCaseId: (caseId: string | null) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

/**
 * Imperative travel arcs via EllipsoidGeodesic + TubeMeshDesc (skill tier 2).
 * Must run after view.init() (WASM geodetic helpers).
 */
export function attachTravelLayer(view: View): TravelLayerHandle {
  const arcs: ArcState[] = [];
  let asOfDate = "2099-01-01";
  let highlightCaseId: string | null = null;
  let layerVisible = true;

  function clearArcs() {
    for (const arc of arcs) {
      arc.tube.delete();
      arc.marker.delete();
    }
    arcs.length = 0;
  }

  function applyStyle() {
    for (const arc of arcs) {
      const p = progressAt(asOfDate, arc.departed, arc.arrived);
      const focused = !highlightCaseId || arc.caseId === highlightCaseId;
      const showArc = layerVisible && p >= 0;
      const showMarker = layerVisible && focused && p > 0 && p < 1;

      arc.tube.visible = showArc;
      arc.marker.visible = showMarker;

      let opacity = 0.85;
      if (p < 0) opacity = 0;
      else if (!focused) opacity = 0.08;
      else if (p >= 1) opacity = 0.35;

      // MeshHandle.update typings omit descriptor keys; cast per Navara mesh descs.
      arc.tube.update({
        tube: {
          color: new Color().setStyle("#0f766e"),
          opacity,
          transparent: true,
        },
      } as never);

      if (showMarker) {
        const idx = Math.min(
          arc.midPoints.length - 1,
          Math.floor(p * (arc.midPoints.length - 1)),
        );
        const pt = arc.midPoints[idx];
        arc.marker.update({
          geodetic: { lng: pt.lng, lat: pt.lat, height: pt.height },
        });
      }
    }
  }

  return {
    setTravels(travels, asOf) {
      asOfDate = asOf;
      clearArcs();
      for (const leg of travels) {
        const departed = leg.departed_at ?? leg.arrived_at ?? asOf;
        const arrived = leg.arrived_at ?? leg.departed_at ?? asOf;
        const start = {
          lat: leg.from.lat,
          lng: leg.from.lon,
          height: 0,
        };
        const end = { lat: leg.to.lat, lng: leg.to.lon, height: 0 };
        const geodesic = new EllipsoidGeodesic(start, end);
        const samples = Math.max(
          32,
          Math.min(128, Math.ceil(geodesic.distance / 50_000)),
        );
        const surface = geodesic.interpolatePoints(samples);
        geodesic.dispose();

        const midPoints = surface.map((pt, i) => {
          const t = i / Math.max(1, surface.length - 1);
          const lift = Math.sin(Math.PI * t) * ARC_LIFT_M;
          return { lat: pt.lat, lng: pt.lng, height: lift };
        });

        const tube = view.addMesh<TubeMeshDesc>({
          tube: {
            points: midPoints.map((pt) =>
              geodeticToVector3({
                lat: pt.lat,
                lng: pt.lng,
                height: pt.height + TUBE_RADIUS_M,
              }),
            ),
            radius: TUBE_RADIUS_M,
            tubularSegments: Math.max(32, midPoints.length),
            radialSegments: 8,
            color: new Color().setStyle("#0f766e"),
            opacity: 0.85,
          },
        });

        const marker = view.addMesh<SphereMeshDesc>({
          sphere: {
            radius: MARKER_RADIUS_M,
            color: new Color().setStyle("#f59e0b"),
            emissiveColor: new Color().setStyle("#f59e0b"),
            emissiveIntensity: 0.25,
          },
          geodetic: {
            lng: midPoints[0]?.lng ?? start.lng,
            lat: midPoints[0]?.lat ?? start.lat,
            height: midPoints[0]?.height ?? 0,
          },
        });
        marker.visible = false;

        arcs.push({
          id: leg.id,
          caseId: leg.case_id,
          departed,
          arrived,
          tube,
          marker,
          midPoints,
        });
      }
      applyStyle();
    },
    setHighlightCaseId(caseId) {
      highlightCaseId = caseId;
      applyStyle();
    },
    setVisible(visible) {
      layerVisible = visible;
      applyStyle();
    },
    destroy() {
      clearArcs();
    },
  };
}
