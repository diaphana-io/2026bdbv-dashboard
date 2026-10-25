import {
  Color,
  EllipsoidGeodesic,
  eastNorthUpToFixedFrame,
  geodeticToVector3,
  type LatLng,
  type MeshHandle,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type {
  ArclineMeshDesc,
  InstancedCylinderMeshDesc,
} from "@navaramap/three-default-descs";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import { Matrix4, Vector3 } from "three";
import type { MapTravel } from "../../lib/data-types";

type View = ThreeView<DefaultDescriptions>;

/** Arc kinds drawn today. Reserved slots noted in ARC_KIND_COLORS. */
export type ArcKind = "travel";
// Future: "spread" (infection 1→many) — batch key + color only; no data yet.

export type ArcEdge = {
  id: string;
  kind: ArcKind;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  departed?: string | null;
  arrived?: string | null;
  caseId?: string | null;
  /** Optional override; defaults to ARC_KIND_COLORS[kind]. */
  color?: string;
};

/**
 * Pastel palette keyed by kind. One mesh batch per kind (+ opacity bucket).
 * Reserved (not wired):
 * - spread — infection expansion arcs (1 case → many)
 * - (other kinds as needed — add color + batch key only)
 */
export const ARC_KIND_COLORS: Record<ArcKind, string> = {
  travel: "#7dd3c0", // soft mint
  // spread: "#f9a8d4", // reserved pastel — infection-spread (not implemented)
};

const ARC_THICKNESS = 2;
const ARC_SEGMENTS = 64;
const ARC_HEIGHT_SCALE = 0.35;
const ARROW_HEIGHT_M = 25_000;
const ARROW_RADIUS_M = 28_000;
const ARROW_LENGTH_M = 70_000;
const ARROW_LOOKAHEAD_M = 40_000;

type OpacityBucket = "active" | "done" | "dim";

const BUCKET_OPACITY: Record<OpacityBucket, number> = {
  active: 0.9,
  done: 0.4,
  dim: 0.08,
};

type EdgeRuntime = {
  edge: ArcEdge;
  geodesic: EllipsoidGeodesic;
  totalDistance: number;
};

type KindBatch = {
  mesh: MeshHandle<ArclineMeshDesc>;
  arrows: MeshHandle<InstancedCylinderMeshDesc>;
};

/** One opacity-bucket slice of a kind batch (non-empty geometry required). */
type ArcLineSlice = {
  geometry: LatLng[];
  srcColor: Color;
  tgtColor: Color;
  thickness: number;
  segments: number;
  arcHeightScale: number;
  gradation: number;
  dashed: boolean;
  transparent: boolean;
  opacity: number;
};

export type TravelLayerHandle = {
  setTravels: (travels: MapTravel[], asOf: string) => void;
  setArcs: (arcs: ArcEdge[], asOf: string) => void;
  setHighlightCaseId: (caseId: string | null) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

function progressAt(asOf: string, departed: string, arrived: string): number {
  if (asOf < departed) return -1;
  if (asOf >= arrived) return 1;
  const a = Date.parse(departed);
  const b = Date.parse(arrived);
  const t = Date.parse(asOf);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

function travelToArcEdge(leg: MapTravel): ArcEdge {
  return {
    id: leg.id,
    kind: "travel",
    from: { lat: leg.from.lat, lng: leg.from.lon },
    to: { lat: leg.to.lat, lng: leg.to.lon },
    departed: leg.departed_at,
    arrived: leg.arrived_at,
    caseId: leg.case_id,
  };
}

function bearingRadians(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.atan2(y, x);
}

// Scratch for arrow instance matrices (reuse; no per-frame alloc in applyStyle).
const scratchRight = new Vector3();
const scratchForward = new Vector3();
const scratchUp = new Vector3(0, 0, 1);
const scratchRotation = new Matrix4();
const scratchScale = new Matrix4();

function arrowMatrixAt(
  geodesic: EllipsoidGeodesic,
  totalDistance: number,
  progress: number,
): Matrix4 {
  const distance = Math.min(
    Math.max(progress, 0) * totalDistance,
    Math.max(0, totalDistance - 1),
  );
  const lookaheadDistance = Math.min(
    distance + ARROW_LOOKAHEAD_M,
    totalDistance,
  );
  const point = geodesic.interpolateDistance(distance);
  const lookahead = geodesic.interpolateDistance(lookaheadDistance);
  const heading = bearingRadians(point, lookahead);

  const origin = geodeticToVector3({
    lat: point.lat,
    lng: point.lng,
    height: ARROW_HEIGHT_M,
  });
  const enu = eastNorthUpToFixedFrame(origin);

  // Cone tip is +Y (radiusTop: 0). Align +Y with travel in the ENU tangent plane.
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  scratchForward.set(sinH, cosH, 0);
  scratchRight.set(-cosH, sinH, 0);
  scratchRotation.makeBasis(scratchRight, scratchForward, scratchUp);
  scratchScale.makeScale(ARROW_RADIUS_M, ARROW_LENGTH_M, ARROW_RADIUS_M);
  return enu.multiply(scratchRotation).multiply(scratchScale);
}

/**
 * Batched pastel Arcline arcs + instanced cone arrow heads.
 * One ArclineMeshDesc (+ one InstancedCylinderMeshDesc) per kind — not 1 mesh
 * per arc. Travel only for now; infection-spread kinds can add a color + batch.
 *
 * LOD / thinning: when arc counts grow, cull or cluster per kind batch here.
 */
export function attachTravelLayer(view: View): TravelLayerHandle {
  const runtimes: EdgeRuntime[] = [];
  const batches = new Map<ArcKind, KindBatch>();
  let asOfDate = "2099-01-01";
  let highlightCaseId: string | null = null;
  let layerVisible = true;

  /**
   * Create a kind batch only with non-empty arc geometry.
   * ArclineMeshDesc with `geometry: []` builds a bare ShaderMaterial sub-mesh;
   * Navara's onResize then does `uniforms?.uViewport.value` and throws
   * "Cannot read properties of undefined (reading 'value')".
   */
  function ensureBatch(kind: ArcKind, initialArcLines: ArcLineSlice[]): KindBatch {
    const existing = batches.get(kind);
    if (existing) return existing;

    const color = new Color().setStyle(ARC_KIND_COLORS[kind]);
    const mesh = view.addMesh<ArclineMeshDesc>({
      arcLines: initialArcLines,
    });

    const arrows = view.addMesh<InstancedCylinderMeshDesc>({
      cylinders: {
        radiusTop: 0,
        radiusBottom: 1,
        radialSegments: 10,
        color,
        emissiveColor: color,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.95,
        children: [],
      },
    });

    const batch = { mesh, arrows };
    batches.set(kind, batch);
    return batch;
  }

  function hideBatch(batch: KindBatch) {
    // Hide only — never update Arcline with empty geometry (breaks uViewport).
    batch.mesh.visible = false;
    batch.arrows.ref.clear();
    batch.arrows.visible = false;
  }

  function clearRuntimes() {
    for (const rt of runtimes) {
      rt.geodesic.dispose();
    }
    runtimes.length = 0;
  }

  function destroyBatches() {
    for (const batch of batches.values()) {
      batch.mesh.delete();
      batch.arrows.delete();
    }
    batches.clear();
  }

  function applyStyle() {
    const byKind = new Map<
      ArcKind,
      {
        buckets: Record<OpacityBucket, LatLng[]>;
        arrowMatrices: Matrix4[];
      }
    >();

    for (const kind of Object.keys(ARC_KIND_COLORS) as ArcKind[]) {
      byKind.set(kind, {
        buckets: { active: [], done: [], dim: [] },
        arrowMatrices: [],
      });
    }

    for (const rt of runtimes) {
      const { edge, geodesic, totalDistance } = rt;
      const departed = edge.departed ?? edge.arrived ?? asOfDate;
      const arrived = edge.arrived ?? edge.departed ?? asOfDate;
      const p = progressAt(asOfDate, departed, arrived);
      if (!layerVisible || p < 0) continue;

      const focused = !highlightCaseId || edge.caseId === highlightCaseId;
      let bucket: OpacityBucket;
      if (!focused) bucket = "dim";
      else if (p >= 1) bucket = "done";
      else bucket = "active";

      const group = byKind.get(edge.kind);
      if (!group) continue;

      const from: LatLng = { lat: edge.from.lat, lng: edge.from.lng };
      const to: LatLng = { lat: edge.to.lat, lng: edge.to.lng };
      group.buckets[bucket].push(from, to);

      // In-progress focused heads only (replaces former Sphere markers).
      if (focused && p > 0 && p < 1) {
        group.arrowMatrices.push(
          arrowMatrixAt(geodesic, totalDistance, p),
        );
      }
    }

    for (const [kind, group] of byKind) {
      const color = new Color().setStyle(ARC_KIND_COLORS[kind]);
      const arcLines: ArcLineSlice[] = [];

      for (const bucket of ["active", "done", "dim"] as OpacityBucket[]) {
        const geometry = group.buckets[bucket];
        if (geometry.length < 2) continue;
        arcLines.push({
          geometry,
          srcColor: color,
          tgtColor: color,
          thickness: ARC_THICKNESS,
          segments: ARC_SEGMENTS,
          arcHeightScale: ARC_HEIGHT_SCALE,
          gradation: 0.5,
          dashed: false,
          transparent: true,
          opacity: BUCKET_OPACITY[bucket],
        });
      }

      if (arcLines.length === 0) {
        const existing = batches.get(kind);
        if (existing) hideBatch(existing);
        continue;
      }

      const batch = ensureBatch(kind, arcLines);
      batch.mesh.update({
        arcLines,
        visible: true,
      } as never);

      const children = group.arrowMatrices.map((matrix) => ({
        matrix,
        color,
      }));
      if (children.length === 0) {
        batch.arrows.ref.clear();
        batch.arrows.visible = false;
      } else {
        batch.arrows.ref.replaceAll(children);
        batch.arrows.visible = true;
      }
    }
  }

  function setArcs(arcs: ArcEdge[], asOf: string) {
    asOfDate = asOf;
    clearRuntimes();
    for (const edge of arcs) {
      const start = {
        lat: edge.from.lat,
        lng: edge.from.lng,
        height: 0,
      };
      const end = { lat: edge.to.lat, lng: edge.to.lng, height: 0 };
      const geodesic = new EllipsoidGeodesic(start, end);
      runtimes.push({
        edge,
        geodesic,
        totalDistance: geodesic.distance,
      });
    }
    applyStyle();
  }

  return {
    setTravels(travels, asOf) {
      setArcs(travels.map(travelToArcEdge), asOf);
    },
    setArcs,
    setHighlightCaseId(caseId) {
      highlightCaseId = caseId;
      applyStyle();
    },
    setVisible(visible) {
      layerVisible = visible;
      applyStyle();
    },
    destroy() {
      clearRuntimes();
      destroyBatches();
    },
  };
}

/** @deprecated Prefer attachTravelLayer; alias kept for rename clarity. */
export const attachArcLayer = attachTravelLayer;
