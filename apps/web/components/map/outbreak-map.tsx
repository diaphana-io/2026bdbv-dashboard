"use client";

import { useEffect, useRef, useState } from "react";
import type { MapSnapshot } from "../../lib/data-types";
import {
  BASEMAPS,
  PAPERS_NE_TILEJSON_URL,
  REEARTH_TERRAIN_URL,
  SPACE_COLOR,
  type BasemapEntry,
  type BasemapId,
  type PapersBasemapColors,
} from "./basemap-style";
import { isTrackedCountryIso } from "@/lib/tracked-countries";
import { MapBootStatus } from "./map-boot-status";
import { useMapUi, type BoundaryLevel } from "./map-ui-context";
import { TimeSlider } from "./time-slider";
import type { CdAdminLayerHandle } from "./cd-admin-layer";
import type { CaseLayersHandle } from "./case-layer";
import type { ExposureLayerHandle } from "./exposure-layer";
import type { LabelLayersHandle } from "./label-layers";
import type { TravelLayerHandle } from "./arc-layer";

type Props = {
  initialSnapshot: MapSnapshot;
  minDate: string;
  maxDate: string;
};

type LayerBundle = {
  boundaries: CdAdminLayerHandle;
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

/**
 * Full-Africa framing, nadir-ish so the globe sits centered in the viewport
 * (pitch -45 left most of the globe below the fold).
 * Center ~Central Africa; height frames the continent with ocean margin.
 */
const DEFAULT_CAMERA: ViewCamera = {
  lng: 20,
  lat: 5,
  height: 6_800_000,
  heading: 0,
  pitch: -88,
  roll: 0,
};

const TERRAIN_ATTRIBUTION = {
  attribution: "© Re:Earth Terrain",
  attributionUrl: "https://terrain.reearth.land/",
};

export function OutbreakMap({ initialSnapshot, minDate, maxDate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<import("@navaramap/three").default | null>(null);
  const layersRef = useRef<LayerBundle | null>(null);
  const removeClickRef = useRef<(() => void) | undefined>(undefined);
  const snapshotRef = useRef(initialSnapshot);
  const asOfRef = useRef(initialSnapshot.asOf);
  const visibilityRef = useRef<{
    boundaries: boolean;
    countryNames: boolean;
    cities: boolean;
    cases: boolean;
    claims: boolean;
    exposures: boolean;
    travels: boolean;
    boundaryLevel: BoundaryLevel;
  }>({
    boundaries: true,
    countryNames: true,
    cities: true,
    cases: true,
    claims: true,
    exposures: true,
    travels: true,
    boundaryLevel: "auto",
  });
  const cameraRef = useRef<ViewCamera>(DEFAULT_CAMERA);
  const bootGenerationRef = useRef(0);

  const {
    basemapId,
    layers,
    boundaryLevel,
    openCaseDetail,
    openCountryStats,
    selectedCaseId,
  } = useMapUi();
  const openCaseDetailRef = useRef(openCaseDetail);
  openCaseDetailRef.current = openCaseDetail;
  const openCountryStatsRef = useRef(openCountryStats);
  openCountryStatsRef.current = openCountryStats;

  const [asOf, setAsOf] = useState(initialSnapshot.asOf);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState<string | null>("navara");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  snapshotRef.current = snapshot;
  asOfRef.current = asOf;
  visibilityRef.current = { ...layers, boundaryLevel };

  function applyLayerVisibility(bundle: LayerBundle) {
    const vis = visibilityRef.current;
    bundle.boundaries.setVisible(vis.boundaries);
    bundle.boundaries.setLevelMode(vis.boundaryLevel);
    bundle.labels.setCountryNamesVisible(vis.countryNames);
    bundle.labels.setCitiesVisible(vis.cities);
    bundle.cases.setCasesVisible(vis.cases);
    bundle.cases.setClaimsVisible(vis.claims);
    bundle.exposures.setVisible(vis.exposures);
    bundle.travels.setVisible(vis.travels);
  }

  function wireFeatureClick(
    view: import("@navaramap/three").default,
  ): () => void {
    const onClick = (
      info:
        | { properties?: Record<string, unknown> }
        | null
        | undefined,
    ) => {
      const props = info?.properties;
      if (!props) return;
      const kind = props["kind"];
      const id = props["id"];
      if (kind === "case" && typeof id === "string") {
        layersRef.current?.travels.setHighlightCaseId(id);
        openCaseDetailRef.current(id);
        return;
      }
      const rawIso = props["admin0_iso"] ?? props["iso"];
      if (typeof rawIso === "string" && isTrackedCountryIso(rawIso)) {
        openCountryStatsRef.current(rawIso);
      }
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
    const container = containerRef.current;
    if (container) {
      container.replaceChildren();
    }
  }

  async function attachPapersBasemap(
    view: import("@navaramap/three").default<
      import("@navaramap/three-default-plugin").DefaultDescriptions
    >,
    tileJsonPlugin: import("@navaramap/three-plugins").TileJsonPlugin,
    Color: typeof import("@navaramap/three").Color,
    colors: PapersBasemapColors,
  ) {
    // Terrain first (render order = add order), then Papers land/borders draped.
    const terrain = view.addSource({
      type: "quantized-mesh",
      url: REEARTH_TERRAIN_URL,
      maxZoom: 18,
      requestVertexNormals: true,
      requestWaterMask: true,
    });
    view.addLayer({
      type: "terrain",
      source: terrain,
      terrain: {},
    });

    // globe.color is the ocean: Papers draws land polygons only.
    view.globe.color = new Color().setStyle(colors.ocean);

    const basemapSource = await tileJsonPlugin.addSource({
      type: "vector-tile",
      url: PAPERS_NE_TILEJSON_URL,
    });

    view.addLayer({
      type: "vector",
      source: basemapSource,
      sourceLayers: ["countries"],
      polygon: {
        color: new Color().setStyle(colors.land),
        opacity: colors.landOpacity,
        transparent: colors.landOpacity < 1,
        clampToGround: true,
        show: true,
      },
    });

    view.addLayer({
      type: "vector",
      source: basemapSource,
      sourceLayers: ["boundary_lines"],
      polyline: {
        color: new Color().setStyle(colors.border),
        opacity: colors.borderOpacity,
        transparent: colors.borderOpacity < 1,
        width: colors.borderWidth,
        clampToGround: true,
        show: true,
      },
    });

    // Papers credit arrives via TileJsonPlugin; only terrain is hand-written.
    view.attribution?.add([TERRAIN_ATTRIBUTION]);
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
      { TileJsonPlugin },
    ] = await Promise.all([
      import("@navaramap/three"),
      import("@navaramap/three-default-plugin"),
      import("@navaramap/three-plugins"),
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

    // All plugins before init (TileJsonPlugin resolves TileJSON during addSource
    // after init, but must be registered before init or addPlugin throws).
    const defaultPlugin = new DefaultPlugin();
    const tileJsonPlugin = new TileJsonPlugin();
    view.addPlugin(defaultPlugin);
    view.addPlugin(tileJsonPlugin);

    await view.init();
    if (generation !== bootGenerationRef.current) {
      view.dispose();
      return;
    }

    viewRef.current = view;

    // Pax Atlas stack: photoreal sky/sun + strong ambient + Papers NE.
    defaultPlugin.addDefaultPhotorealScene();
    view.addLight({
      ambient: {
        intensity: 20,
        color: new Color().setStyle("#ffffff"),
      },
    });
    view.toneMappingExposure = entry.toneMappingExposure;

    await attachPapersBasemap(view, tileJsonPlugin, Color, entry.colors);
    if (generation !== bootGenerationRef.current) {
      view.dispose();
      viewRef.current = null;
      return;
    }

    const cam = cameraRef.current;
    view.setCamera(cam);

    setLoading("layers");
    const [
      { attachCdAdminLayer },
      { attachLabelLayers },
      { attachCaseLayers },
      { attachExposureLayer },
      { attachTravelLayer },
    ] = await Promise.all([
      import("./cd-admin-layer"),
      import("./label-layers"),
      import("./case-layer"),
      import("./exposure-layer"),
      import("./arc-layer"),
    ]);
    if (generation !== bootGenerationRef.current) {
      view.dispose();
      viewRef.current = null;
      return;
    }

    const boundaries = attachCdAdminLayer(view);
    const labels = await attachLabelLayers(view, entry.mode);
    const cases = attachCaseLayers(view, entry.mode);
    const exposures = attachExposureLayer(view);
    const travels = attachTravelLayer(view);

    const snap = snapshotRef.current;
    boundaries.setAggregates(snap.aggregates);
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
    removeClickRef.current = wireFeatureClick(view);

    setLoading(null);
    setMapReady(true);
  }

  // Single boot path keyed on basemapId — avoids the mapReady/swap race that
  // cancelled recreates when bootView flipped mapReady mid-swap.
  useEffect(() => {
    let cancelled = false;
    const generation = ++bootGenerationRef.current;

    async function run() {
      try {
        await destroyView();
        if (cancelled || generation !== bootGenerationRef.current) return;
        await bootView(basemapId, generation);
      } catch (err) {
        if (!cancelled && generation === bootGenerationRef.current) {
          setMapError(
            err instanceof Error ? err.message : "Failed to initialize map",
          );
          setLoading(null);
          setMapReady(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      bootGenerationRef.current += 1;
      void destroyView();
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basemapId drives full recreate
  }, [basemapId]);

  useEffect(() => {
    const bundle = layersRef.current;
    if (!bundle || !mapReady) return;
    applyLayerVisibility(bundle);
  }, [layers, boundaryLevel, mapReady]);

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
        bundle.boundaries.setAggregates(next.aggregates);
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
