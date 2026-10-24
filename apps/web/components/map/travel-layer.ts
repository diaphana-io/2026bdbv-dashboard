import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";
import type { MapTravel } from "../../lib/data-types";

type ArcState = {
  id: string;
  points: { x: number; y: number; z: number }[];
  departed: string;
  arrived: string;
  mesh: import("three").Line;
  marker: import("three").Mesh;
};

function mercatorToWorld(
  maplibre: typeof import("maplibre-gl"),
  lon: number,
  lat: number,
  altitude = 0,
) {
  const mc = maplibre.MercatorCoordinate.fromLngLat(
    { lng: lon, lat },
    altitude,
  );
  return { x: mc.x, y: mc.y, z: mc.z ?? 0 };
}

function greatCircle(
  maplibre: typeof import("maplibre-gl"),
  from: { lon: number; lat: number },
  to: { lon: number; lat: number },
  segments = 48,
) {
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lon = from.lon + (to.lon - from.lon) * t;
    const lat = from.lat + (to.lat - from.lat) * t;
    const lift = Math.sin(Math.PI * t) * 0.00008;
    points.push(mercatorToWorld(maplibre, lon, lat, lift));
  }
  return points;
}

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
  destroy: () => void;
};

export async function attachTravelLayer(
  map: MapLibreMap,
): Promise<TravelLayerHandle> {
  const [maplibre, THREE] = await Promise.all([
    import("maplibre-gl"),
    import("three"),
  ]);

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: import("three").WebGLRenderer | null = null;
  const arcs: ArcState[] = [];
  let asOfDate = "2099-01-01";

  const layer: CustomLayerInterface = {
    id: "bdbv-travel-three",
    type: "custom",
    renderingMode: "3d",
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (!renderer) return;
      const matrix =
        "defaultProjectionData" in args &&
        args.defaultProjectionData &&
        "mainMatrix" in args.defaultProjectionData
          ? (args.defaultProjectionData.mainMatrix as number[])
          : (args as unknown as number[]);
      const m = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = m;

      for (const arc of arcs) {
        const p = progressAt(asOfDate, arc.departed, arc.arrived);
        arc.mesh.visible = p >= 0;
        arc.marker.visible = p > 0 && p < 1;
        if (p > 0 && p < 1) {
          const idx = Math.min(
            arc.points.length - 1,
            Math.floor(p * (arc.points.length - 1)),
          );
          const pt = arc.points[idx];
          arc.marker.position.set(pt.x, pt.y, pt.z);
        }
        const mat = arc.mesh.material as import("three").LineBasicMaterial;
        mat.opacity = p >= 1 ? 0.35 : p >= 0 ? 0.9 : 0;
      }

      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    },
  };

  map.addLayer(layer);

  function clearArcs() {
    for (const arc of arcs) {
      scene.remove(arc.mesh);
      scene.remove(arc.marker);
      arc.mesh.geometry.dispose();
      (arc.mesh.material as import("three").Material).dispose();
      arc.marker.geometry.dispose();
      (arc.marker.material as import("three").Material).dispose();
    }
    arcs.length = 0;
  }

  return {
    setTravels(travels: MapTravel[], asOf: string) {
      asOfDate = asOf;
      clearArcs();
      for (const leg of travels) {
        const departed = leg.departed_at ?? leg.arrived_at ?? asOf;
        const arrived = leg.arrived_at ?? leg.departed_at ?? asOf;
        const points = greatCircle(
          maplibre,
          { lon: leg.from.lon, lat: leg.from.lat },
          { lon: leg.to.lon, lat: leg.to.lat },
        );
        const positions = new Float32Array(points.length * 3);
        points.forEach((pt, i) => {
          positions[i * 3] = pt.x;
          positions[i * 3 + 1] = pt.y;
          positions[i * 3 + 2] = pt.z;
        });
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x0f766e,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
        });
        const mesh = new THREE.Line(geom, lineMat);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.00002, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
        );
        scene.add(mesh);
        scene.add(marker);
        arcs.push({
          id: leg.id,
          points,
          departed,
          arrived,
          mesh,
          marker,
        });
      }
      map.triggerRepaint();
    },
    destroy() {
      clearArcs();
      if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      renderer?.dispose();
      renderer = null;
    },
  };
}
