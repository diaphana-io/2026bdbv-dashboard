"use client";

import { useEffect, useRef, useState } from "react";
import type { MapSnapshot } from "../../lib/data-types";
import {
  BASEMAPS,
  OCEAN_COLOR,
  SPACE_COLOR,
  type BasemapEntry,
  type BasemapId,
} from "./basemap-style";
import { MapBootStatus } from "./map-boot-status";
import { useMapUi } from "./map-ui-context";
import { TimeSlider } from "./time-slider";
import type { BoundaryLayerHandle } from "./boundary-layer";
import type { CaseLayersHandle } from "./case-layer";
import type { ExposureLayerHandle } from "./exposure-layer";
import type { LabelLayersHandle } from "./label-layers";
import type { TravelLayerHandle } from "./travel-layer";

type Props = {
  initialSnapshot: MapSnapshot;
  minDate: string;
  maxDate: string;
};

type LayerBundle = {
  boundaries: BoundaryLayerHandle;
  labels: LabelLayersHandle;
  cases: CaseLayersHandle;
  exposures: ExposureLayerHandle;
  travels: TravelLayerHandle;
};

type ViewCamera = {
  lng: number;
  lat: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
};

const DEFAULT_CAMERA: ViewCamera = {
  lng: 20,
  lat: 3,
  height: 8_000_000,
  heading: 0,
  pitch: -45,
  roll: 0,
};

export function OutbreakMap({ initialSnapshot, minDate, maxDate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<import("@navaramap/three").default | null>(null);
  const layersRef = useRef<LayerBundle | null>(null);
  const removeClickRef = useRef<(() => void) | undefined>(undefined);
  const appliedBasemapRef = useRef<BasemapId | null>(null);
  const snapshotRef = useRef(initialSnapshot);
  const asOfRef = useRef(initialSnapshot.asOf);
  const visibilityRef = useRef({
    boundaries: true,
    countryNames: true,
    cities: true,
    cases: true,
    exposures: true,
    travels: true,
  });
  const cameraRef = useRef<ViewCamera>(DEFAULT_CAMERA);
  const bootGenerationRef = useRef(0);

  const { basemapId, layers, openCaseDetail, selectedCaseId } = useMapUi();
  const openCaseDetailRef = useRef(openCaseDetail);
  openCaseDetailRef.current = openCaseDetail;

  const [asOf, setAsOf] = useState(initialSnapshot.asOf);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState<string | null>("navara");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  snapshotRef.current = snapshot;
  asOfRef.current = asOf;
  visibilityRef.current = layers;

  function applyLayerVisibility(bundle: LayerBundle) {
    const vis = visibilityRef.current;
    bundle.boundaries.setVisible(vis.boundaries);
    bundle.labels.setCountryNamesVisible(vis.countryNames);
    bundle.labels.setCitiesVisible(vis.cities);
    bundle.cases.setVisible(vis.cases);
    bundle.exposures.setVisible(vis.exposures);
    bundle.travels.setVisible(vis.travels);
  }

  function wireCaseClick(
    view: import("@navaramap/three").default,
  ): () => void {
    const onClick = (
      info:
        | { properties?: Record<string, unknown> }
        | null
        | undefined,
    ) => {
      const kind = info?.properties?.["kind"];
      const id = info?.properties?.["id"];
      if (kind !== "case" || typeof id !== "string") return;
      layersRef.current?.travels.setHighlightCaseId(id);
      openCaseDetailRef.current(id);
    };
    view.on("featureClick", onClick);
    return () => {
      view.off("featureClick", onClick);
    };
  }

  async function destroyView() {
    removeClickRef.current?.();
    removeClickRef.current = undefined;
    layersRef.current?.travels.destroy();
    layersRef.current?.cases.destroy();
    layersRef.current?.exposures.destroy();
    layersRef.current?.labels.destroy();
    layersRef.current?.boundaries.destroy();
    layersRef.current = null;
    const view = viewRef.current;
    viewRef.current = null;
    if (view) {
      try {
        const geo = view.camera.positionGeographic;
        const ori = view.camera.orientation;
        cameraRef.current = {
          lng: geo.lng,
          lat: geo.lat,
          height: geo.height,
          heading: ori.heading ?? DEFAULT_CAMERA.heading,
          pitch: ori.pitch ?? DEFAULT_CAMERA.pitch,
          roll: ori.roll ?? DEFAULT_CAMERA.roll,
        };
      } catch {
        /* dispose may already have torn down camera */
      }
      view.dispose();
    }
  }

  async function bootView(bootId: BasemapId, generation: number) {
    const container = containerRef.current;
    if (!container) return;

    setLoading("navara");
    setMapError(null);
    setMapReady(false);

    const [
      { default: ThreeView, Color },
      { DefaultPlugin },
      { MapLibreStylePlugin },
    ] = await Promise.all([
      import("@navaramap/three"),
      import("@navaramap/three-default-plugin"),
      import("@navaramap/maplibre-style"),
    ]);
    if (generation !== bootGenerationRef.current || !containerRef.current) {
      return;
    }

    setLoading("OutbreakMap");
    const entry: BasemapEntry = BASEMAPS[bootId];
    const view = new ThreeView<
      import("@navaramap/three-default-plugin").DefaultDescriptions
    >({
      container: containerRef.current,
      backgroundColor: new Color().setStyle(SPACE_COLOR),
      picking: true,
      animation: true,
    });

    const defaultPlugin = new DefaultPlugin();
    view.addPlugin(defaultPlugin);

    if (entry.kind === "maplibre-style") {
      // forceMapLibreFov exists at runtime in Navara examples; not in 0.2.1 types.
      view.addPlugin(
        new MapLibreStylePlugin(entry.styleUrl, {
          forceMapLibreFov: true,
        } as ConstructorParameters<typeof MapLibreStylePlugin>[1]),
      );
    }

    await view.init();
    if (generation !== bootGenerationRef.current) {
      view.dispose();
      return;
    }

    viewRef.current = view;
    view.globe.color = new Color().setStyle(OCEAN_COLOR);

    // Always ellipsoid so both native and MapLibre styles drape on a full globe.
    view.addLayer({ type: "terrain", ellipsoid: {} });

    if (entry.kind === "native-raster") {
      const raster = view.addSource({
        type: "raster-tile",
        url: entry.url,
        maxZoom: entry.maxZoom,
      });
      view.addLayer({ type: "raster", source: raster });
      view.attribution?.add([
        {
          attributionHtml: entry.attribution,
        },
      ]);
    }

    // Non-draped travel tubes need at least ambient light.
    view.addLight({ ambient: { intensity: 1 } });

    const cam = cameraRef.current;
    view.setCamera(cam);

    setLoading("layers");
    const [
      { attachBoundaryLayer },
      { attachLabelLayers },
      { attachCaseLayers },
      { attachExposureLayer },
      { attachTravelLayer },
    ] = await Promise.all([
      import("./boundary-layer"),
      import("./label-layers"),
      import("./case-layer"),
      import("./exposure-layer"),
      import("./travel-layer"),
    ]);
    if (generation !== bootGenerationRef.current) {
      view.dispose();
      viewRef.current = null;
      return;
    }

    const boundaries = attachBoundaryLayer(view);
    const labels = await attachLabelLayers(view);
    const cases = attachCaseLayers(view, entry.mode);
    const exposures = attachExposureLayer(view);
    const travels = attachTravelLayer(view);

    const snap = snapshotRef.current;
    cases.update(snap.cases, snap.aggregates);
    exposures.update(snap.exposures);
    travels.setTravels(snap.travels, asOfRef.current);

    const bundle: LayerBundle = {
      boundaries,
      labels,
      cases,
      exposures,
      travels,
    };
    layersRef.current = bundle;
    applyLayerVisibility(bundle);
    removeClickRef.current = wireCaseClick(view);

    appliedBasemapRef.current = bootId;
    setLoading(null);
    setMapReady(true);
  }

  useEffect(() => {
    let cancelled = false;
    const generation = ++bootGenerationRef.current;
    const bootId = basemapId;
    appliedBasemapRef.current = bootId;

    async function run() {
      try {
        await bootView(bootId, generation);
      } catch (err) {
        if (!cancelled && generation === bootGenerationRef.current) {
          setMapError(
            err instanceof Error ? err.message : "Failed to initialize map",
          );
          setLoading(null);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      bootGenerationRef.current += 1;
      void destroyView();
      setMapReady(false);
      appliedBasemapRef.current = null;
    };
    // Boot once; basemap swaps handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    if (appliedBasemapRef.current === basemapId) return;

    let cancelled = false;
    const generation = ++bootGenerationRef.current;
    appliedBasemapRef.current = basemapId;

    async function swap() {
      try {
        await destroyView();
        if (cancelled) return;
        await bootView(basemapId, generation);
      } catch (err) {
        if (!cancelled) {
          console.warn("[OutbreakMap] basemap swap failed", err);
        }
      }
    }

    void swap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basemapId drives swap
  }, [basemapId, mapReady]);

  useEffect(() => {
    const bundle = layersRef.current;
    if (!bundle || !mapReady) return;
    applyLayerVisibility(bundle);
  }, [layers, mapReady]);

  useEffect(() => {
    if (selectedCaseId) return;
    layersRef.current?.travels.setHighlightCaseId(null);
  }, [selectedCaseId]);

  const skipFetchRef = useRef(true);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    let cancelled = false;
    async function load() {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_BASE_PATH ?? ""}/api/map/snapshot?asOf=${encodeURIComponent(asOf)}`,
      );
      if (!res.ok || cancelled) return;
      const next = (await res.json()) as MapSnapshot;
      if (cancelled) return;
      setSnapshot(next);
      const bundle = layersRef.current;
      if (bundle) {
        bundle.cases.update(next.cases, next.aggregates);
        bundle.exposures.update(next.exposures);
        bundle.travels.setTravels(next.travels, asOf);
        applyLayerVisibility(bundle);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [asOf]);

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden"
      style={{ backgroundColor: SPACE_COLOR }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        style={{ backgroundColor: SPACE_COLOR }}
      />
      <MapBootStatus loading={loading} error={mapError} />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <TimeSlider
          min={minDate}
          max={maxDate}
          value={asOf}
          onChange={setAsOf}
        />
      </div>
    </div>
  );
}
