"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { CaseDetail, MapSnapshot } from "../../lib/data-types";
import {
  ensureCaseLayers,
  onCaseClick,
  updateCaseLayers,
  type CaseLayerMode,
} from "./case-layer";
import { CaseDrawer } from "./case-drawer";
import {
  ensureExposureLayer,
  updateExposureLayer,
} from "./exposure-layer";
import { MapBootStatus } from "./map-boot-status";
import { TimeSlider } from "./time-slider";
import type { TravelLayerHandle } from "./travel-layer";

type Props = {
  initialSnapshot: MapSnapshot;
  minDate: string;
  maxDate: string;
};

const BASEMAP = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

function mapMode(resolvedTheme: string | undefined): CaseLayerMode {
  return resolvedTheme === "dark" ? "dark" : "light";
}

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
  const appliedModeRef = useRef<CaseLayerMode | null>(null);
  const snapshotRef = useRef(initialSnapshot);
  const asOfRef = useRef(initialSnapshot.asOf);

  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [asOf, setAsOf] = useState(initialSnapshot.asOf);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState<string | null>("maplibre-gl");
  const [mapError, setMapError] = useState<string | null>(null);

  snapshotRef.current = snapshot;
  asOfRef.current = asOf;

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    const bootMode = mapMode(resolvedTheme);
    appliedModeRef.current = bootMode;

    async function boot() {
      try {
        setLoading("maplibre-gl");
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        setLoading("OutbreakMap");
        const map = new maplibre.Map({
          container: containerRef.current,
          style: BASEMAP[bootMode],
          center: [20, 3],
          zoom: 2.5,
          pitch: 30,
          bearing: 0,
          minZoom: 0,
          maxZoom: 14,
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
          { padding: 48, duration: 0, pitch: 30, bearing: 0 },
        );

        ensureCaseLayers(map, bootMode);
        ensureExposureLayer(map);
        updateCaseLayers(
          map,
          snapshotRef.current.cases,
          snapshotRef.current.aggregates,
        );
        updateExposureLayer(map, snapshotRef.current.exposures);

        removeClickRef.current = onCaseClick(map, async (caseId) => {
          setDetailLoading(true);
          setDetail(null);
          travelRef.current?.setHighlightCaseId(caseId);
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_APP_BASE_PATH ?? ""}/api/map/case?id=${encodeURIComponent(caseId)}`,
            );
            if (res.ok) setDetail((await res.json()) as CaseDetail);
          } finally {
            setDetailLoading(false);
          }
        });

        map.resize();
        const canvas = map.getCanvas();
        if (!canvas.width || !canvas.height) {
          setMapError(
            `Map canvas is ${canvas.width}×${canvas.height}px — layout/CSS failed`,
          );
          return;
        }
        setLoading(null);

        try {
          const { attachTravelLayer } = await import("./travel-layer");
          if (cancelled) return;
          travelRef.current = await attachTravelLayer(map);
          travelRef.current.setTravels(
            snapshotRef.current.travels,
            asOfRef.current,
          );
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
      appliedModeRef.current = null;
    };
    // Boot once after theme hydrates; style swaps handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once when themeReady
  }, [themeReady]);

  useEffect(() => {
    if (!themeReady) return;
    const map = mapRef.current;
    if (!map) return;

    const mode = mapMode(resolvedTheme);
    if (appliedModeRef.current === mode) return;
    appliedModeRef.current = mode;

    let cancelled = false;
    const active = map;

    async function swapStyle() {
      try {
        travelRef.current?.destroy();
        travelRef.current = null;
        removeClickRef.current?.();
        removeClickRef.current = undefined;

        active.setStyle(BASEMAP[mode]);
        await waitForStyle(active);
        if (cancelled) return;

        ensureCaseLayers(active, mode);
        ensureExposureLayer(active);
        updateCaseLayers(
          active,
          snapshotRef.current.cases,
          snapshotRef.current.aggregates,
        );
        updateExposureLayer(active, snapshotRef.current.exposures);

        removeClickRef.current = onCaseClick(active, async (caseId) => {
          setDetailLoading(true);
          setDetail(null);
          travelRef.current?.setHighlightCaseId(caseId);
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_APP_BASE_PATH ?? ""}/api/map/case?id=${encodeURIComponent(caseId)}`,
            );
            if (res.ok) setDetail((await res.json()) as CaseDetail);
          } finally {
            setDetailLoading(false);
          }
        });

        try {
          const { attachTravelLayer } = await import("./travel-layer");
          if (cancelled) return;
          travelRef.current = await attachTravelLayer(active);
          travelRef.current.setTravels(
            snapshotRef.current.travels,
            asOfRef.current,
          );
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
  }, [resolvedTheme, themeReady]);

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
      }
      travelRef.current?.setTravels(next.travels, asOf);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [asOf]);

  return (
    <div className="relative h-[calc(100vh-3.25rem)] w-full overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full [&_.maplibregl-map]:!h-full [&_.maplibregl-map]:!w-full"
      />
      <MapBootStatus loading={loading} error={mapError} />
      <CaseDrawer
        detail={detail}
        loading={detailLoading}
        onClose={() => {
          setDetail(null);
          travelRef.current?.setHighlightCaseId(null);
        }}
      />
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
