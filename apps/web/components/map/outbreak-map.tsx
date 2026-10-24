"use client";

import { useEffect, useRef, useState } from "react";
import type { MapSnapshot } from "../../lib/data-types";
import { BASEMAPS, type BasemapId } from "./basemap-style";
import {
  ensureBoundaryLayer,
  setBoundaryLayerVisible,
} from "./boundary-layer";
import {
  ensureCaseLayers,
  onCaseClick,
  setCaseLayersVisible,
  updateCaseLayers,
} from "./case-layer";
import {
  ensureExposureLayer,
  setExposureLayerVisible,
  updateExposureLayer,
} from "./exposure-layer";
import { MapBootStatus } from "./map-boot-status";
import { useMapUi } from "./map-ui-context";
import { TimeSlider } from "./time-slider";
import type { TravelLayerHandle } from "./travel-layer";

type Props = {
  initialSnapshot: MapSnapshot;
  minDate: string;
  maxDate: string;
};

function waitForStyle(map: import("maplibre-gl").Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      if (map.isStyleLoaded()) {
        resolve();
        return;
      }
      reject(new Error("Basemap style timed out"));
    }, 15_000);
    const done = () => {
      window.clearTimeout(t);
      resolve();
    };
    if (map.isStyleLoaded()) {
      done();
      return;
    }
    map.once("style.load", done);
  });
}

export function OutbreakMap({ initialSnapshot, minDate, maxDate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const travelRef = useRef<TravelLayerHandle | null>(null);
  const removeClickRef = useRef<(() => void) | undefined>(undefined);
  const appliedBasemapRef = useRef<BasemapId | null>(null);
  const snapshotRef = useRef(initialSnapshot);
  const asOfRef = useRef(initialSnapshot.asOf);
  const layersRef = useRef({
    boundaries: true,
    cases: true,
    exposures: true,
    travels: true,
  });

  const { basemapId, layers, openCaseDetail, selectedCaseId } = useMapUi();
  const openCaseDetailRef = useRef(openCaseDetail);
  openCaseDetailRef.current = openCaseDetail;

  const [asOf, setAsOf] = useState(initialSnapshot.asOf);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState<string | null>("maplibre-gl");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  snapshotRef.current = snapshot;
  asOfRef.current = asOf;
  layersRef.current = layers;

  function applyLayerVisibility(map: import("maplibre-gl").Map) {
    const vis = layersRef.current;
    setBoundaryLayerVisible(map, vis.boundaries);
    setCaseLayersVisible(map, vis.cases);
    setExposureLayerVisible(map, vis.exposures);
    travelRef.current?.setVisible(vis.travels);
  }

  function wireCaseClick(map: import("maplibre-gl").Map) {
    removeClickRef.current?.();
    removeClickRef.current = onCaseClick(map, (caseId) => {
      travelRef.current?.setHighlightCaseId(caseId);
      openCaseDetailRef.current(caseId);
    });
  }

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    const bootId = basemapId;
    appliedBasemapRef.current = bootId;

    async function boot() {
      try {
        setLoading("maplibre-gl");
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        setLoading("OutbreakMap");
        const entry = BASEMAPS[bootId];
        const map = new maplibre.Map({
          container: containerRef.current,
          style: entry.style(),
          center: [20, 3],
          zoom: 2.5,
          pitch: 0,
          bearing: 0,
          minZoom: 0,
          // Region/city is enough; avoid neighborhood-scale tile cost (#5).
          maxZoom: 11,
        });
        map.addControl(
          new maplibre.NavigationControl({ visualizePitch: true }),
          "top-left",
        );
        mapRef.current = map;

        map.on("error", (e) => {
          console.warn("[OutbreakMap]", e.error);
        });

        setLoading("basemap");
        await waitForStyle(map);
        if (cancelled) return;

        map.resize();
        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);

        map.fitBounds(
          [
            [-18, -35],
            [52, 38],
          ],
          { padding: 48, duration: 0, pitch: 0, bearing: 0 },
        );

        ensureBoundaryLayer(map);
        ensureCaseLayers(map, entry.mode);
        ensureExposureLayer(map);
        updateCaseLayers(
          map,
          snapshotRef.current.cases,
          snapshotRef.current.aggregates,
        );
        updateExposureLayer(map, snapshotRef.current.exposures);
        applyLayerVisibility(map);
        wireCaseClick(map);

        map.resize();
        const canvas = map.getCanvas();
        if (!canvas.width || !canvas.height) {
          setMapError(
            `Map canvas is ${canvas.width}×${canvas.height}px — layout/CSS failed`,
          );
          return;
        }
        setLoading(null);
        setMapReady(true);

        try {
          const { attachTravelLayer } = await import("./travel-layer");
          if (cancelled) return;
          travelRef.current = await attachTravelLayer(map);
          travelRef.current.setTravels(
            snapshotRef.current.travels,
            asOfRef.current,
          );
          travelRef.current.setVisible(layersRef.current.travels);
        } catch (err) {
          console.error("[OutbreakMap] travel layer failed", err);
        }
      } catch (err) {
        if (!cancelled) {
          setMapError(
            err instanceof Error ? err.message : "Failed to initialize map",
          );
          setLoading(null);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      removeClickRef.current?.();
      removeClickRef.current = undefined;
      travelRef.current?.destroy();
      travelRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      appliedBasemapRef.current = null;
      setMapReady(false);
    };
    // Boot once; basemap swaps handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (appliedBasemapRef.current === basemapId) return;
    appliedBasemapRef.current = basemapId;

    let cancelled = false;
    const active = map;
    const entry = BASEMAPS[basemapId];

    async function swapStyle() {
      try {
        travelRef.current?.destroy();
        travelRef.current = null;
        removeClickRef.current?.();
        removeClickRef.current = undefined;

        active.setStyle(entry.style());
        await waitForStyle(active);
        if (cancelled) return;

        ensureBoundaryLayer(active);
        ensureCaseLayers(active, entry.mode);
        ensureExposureLayer(active);
        updateCaseLayers(
          active,
          snapshotRef.current.cases,
          snapshotRef.current.aggregates,
        );
        updateExposureLayer(active, snapshotRef.current.exposures);
        applyLayerVisibility(active);
        wireCaseClick(active);

        try {
          const { attachTravelLayer } = await import("./travel-layer");
          if (cancelled) return;
          travelRef.current = await attachTravelLayer(active);
          travelRef.current.setTravels(
            snapshotRef.current.travels,
            asOfRef.current,
          );
          travelRef.current.setVisible(layersRef.current.travels);
        } catch (err) {
          console.error("[OutbreakMap] travel layer failed", err);
        }
      } catch (err) {
        console.warn("[OutbreakMap] style swap failed", err);
      }
    }

    void swapStyle();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basemapId drives swap
  }, [basemapId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyLayerVisibility(map);
  }, [layers, mapReady]);

  useEffect(() => {
    if (selectedCaseId) return;
    travelRef.current?.setHighlightCaseId(null);
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
      const map = mapRef.current;
      if (map?.isStyleLoaded()) {
        updateCaseLayers(map, next.cases, next.aggregates);
        updateExposureLayer(map, next.exposures);
        applyLayerVisibility(map);
      }
      travelRef.current?.setTravels(next.travels, asOf);
      travelRef.current?.setVisible(layersRef.current.travels);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [asOf]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full [&_.maplibregl-map]:!h-full [&_.maplibregl-map]:!w-full [&_.maplibregl-ctrl-top-left]:!top-11"
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
