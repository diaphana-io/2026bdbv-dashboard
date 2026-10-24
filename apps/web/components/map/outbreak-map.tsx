"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseDetail, MapSnapshot } from "../../lib/data-types";
import { ensureCaseLayers, onCaseClick, updateCaseLayers } from "./case-layer";
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

export function OutbreakMap({ initialSnapshot, minDate, maxDate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const travelRef = useRef<TravelLayerHandle | null>(null);
  const [asOf, setAsOf] = useState(initialSnapshot.asOf);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState<string | null>("maplibre-gl");
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let removeClick: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    async function boot() {
      try {
        setLoading("maplibre-gl");
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        setLoading("OutbreakMap");
        const map = new maplibre.Map({
          container: containerRef.current,
          style: {
            version: 8,
            glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
            sources: {
              carto: {
                type: "raster",
                tiles: [
                  "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
                ],
                tileSize: 256,
                attribution: "&copy; OpenStreetMap &copy; CARTO",
              },
            },
            layers: [
              {
                id: "carto",
                type: "raster",
                source: "carto",
              },
            ],
          },
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
        map.resize();
        map.fitBounds(
          [
            [-18, -35],
            [52, 38],
          ],
          { padding: 48, duration: 0, pitch: 30, bearing: 0 },
        );

        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);

        map.on("error", (e) => {
          console.warn("[OutbreakMap]", e.error);
        });

        setLoading("basemap (CARTO)");
        await new Promise<void>((resolve) => {
          map.once("load", () => resolve());
        });
        if (cancelled) return;

        map.resize();
        map.fitBounds(
          [
            [-18, -35],
            [52, 38],
          ],
          { padding: 48, duration: 0, pitch: 30, bearing: 0 },
        );

        setLoading("case-layer / exposure-layer");
        ensureCaseLayers(map);
        ensureExposureLayer(map);
        updateCaseLayers(map, snapshot.cases, snapshot.aggregates);
        updateExposureLayer(map, snapshot.exposures);

        removeClick = onCaseClick(map, async (caseId) => {
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

        await new Promise<void>((resolve) => {
          map.once("idle", () => resolve());
          requestAnimationFrame(() => {
            if (map.loaded()) resolve();
          });
        });
        if (cancelled) return;

        setLoading("travel-layer + three");
        try {
          const { attachTravelLayer } = await import("./travel-layer");
          if (cancelled) return;
          travelRef.current = await attachTravelLayer(map);
          travelRef.current.setTravels(snapshot.travels, asOf);
        } catch (err) {
          console.error("[OutbreakMap] travel layer failed", err);
        }

        if (cancelled) return;
        map.resize();
        const canvas = map.getCanvas();
        if (!canvas.width || !canvas.height) {
          setMapError(
            `Map canvas is ${canvas.width}×${canvas.height}px — layout/CSS failed`,
          );
          return;
        }
        setLoading(null);
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
      removeClick?.();
      travelRef.current?.destroy();
      travelRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

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
    <div className="relative h-[calc(100vh-3.25rem)] w-full overflow-hidden bg-[#e8eef2]">
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
