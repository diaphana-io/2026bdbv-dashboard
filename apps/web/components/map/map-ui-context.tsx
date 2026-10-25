"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import {
  BASEMAPS,
  DEFAULT_BASEMAP_ID,
  type BasemapId,
  basemapIdForUiTheme,
  resolveBasemapId,
} from "./basemap-style";
import type { PanelId, PanelPosition } from "../panels/types";
import type { TrackedCountryIso } from "@/lib/tracked-countries";

/**
 * v6: Dark basemap only; boundaries = DRC COD-AB LOD outlines (not tracked fills).
 * v5 could still hold light basemap / theme-sync prefs.
 */
const STORAGE_KEY = "bdbv-map-ui-v6";
const PREV_STORAGE_KEY = "bdbv-map-ui-v5";

/** Defaults live here (not registry) to avoid circular imports with panel components. */
const PANEL_DEFAULTS: Record<
  PanelId,
  { defaultOpen: boolean; defaultPosition: PanelPosition }
> = {
  "country-stats": { defaultOpen: false, defaultPosition: { x: 12, y: 12 } },
  "case-detail": { defaultOpen: false, defaultPosition: { x: 10_000, y: 12 } },
};

const PANEL_IDS = Object.keys(PANEL_DEFAULTS) as PanelId[];

export type LayerVisibility = {
  boundaries: boolean;
  countryNames: boolean;
  cities: boolean;
  cases: boolean;
  exposures: boolean;
  travels: boolean;
};

export type { PanelPosition };

type PersistedMapUi = {
  openPanels?: Partial<Record<PanelId, boolean>>;
  panelPositions?: Partial<Record<PanelId, PanelPosition>>;
  layers?: Partial<LayerVisibility>;
  basemapId?: BasemapId;
  syncBasemapToUiTheme?: boolean;
};

type MapUiContextValue = {
  openPanels: Record<PanelId, boolean>;
  panelPositions: Record<PanelId, PanelPosition>;
  layers: LayerVisibility;
  basemapId: BasemapId;
  syncBasemapToUiTheme: boolean;
  selectedCaseId: string | null;
  selectedCountryIso: TrackedCountryIso | null;
  focusedPanelId: PanelId | null;
  setPanelOpen: (id: PanelId, open: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  setLayerVisible: (layer: keyof LayerVisibility, visible: boolean) => void;
  setBasemapId: (id: BasemapId) => void;
  setSyncBasemapToUiTheme: (sync: boolean) => void;
  openCaseDetail: (caseId: string) => void;
  closeCaseDetail: () => void;
  /** Open country-stats; pass iso to focus one country, omit for all tracked. */
  openCountryStats: (iso?: TrackedCountryIso) => void;
  focusPanel: (id: PanelId) => void;
  basemapOptions: typeof BASEMAPS;
};

const MapUiContext = createContext<MapUiContextValue | null>(null);

function defaultOpenPanels(): Record<PanelId, boolean> {
  const out = {} as Record<PanelId, boolean>;
  for (const id of PANEL_IDS) {
    out[id] = PANEL_DEFAULTS[id].defaultOpen;
  }
  return out;
}

function defaultPanelPositions(): Record<PanelId, PanelPosition> {
  const out = {} as Record<PanelId, PanelPosition>;
  for (const id of PANEL_IDS) {
    out[id] = { ...PANEL_DEFAULTS[id].defaultPosition };
  }
  return out;
}

const DEFAULT_LAYERS: LayerVisibility = {
  boundaries: true,
  countryNames: true,
  cities: true,
  cases: true,
  exposures: true,
  travels: true,
};

function readPersisted(): PersistedMapUi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(PREV_STORAGE_KEY) ??
      window.localStorage.getItem("bdbv-map-ui-v4") ??
      window.localStorage.getItem("bdbv-map-ui-v3");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedMapUi;
    // Always show DRC admin boundaries + country names. Dark-only: drop theme
    // sync and normalize any persisted light basemap.
    return {
      ...parsed,
      basemapId: resolveBasemapId(parsed.basemapId),
      syncBasemapToUiTheme: false,
      layers: {
        ...parsed.layers,
        boundaries: true,
        countryNames: true,
      },
    };
  } catch {
    return null;
  }
}

function mergeInitialState(persisted: PersistedMapUi | null) {
  const openPanels = defaultOpenPanels();
  const panelPositions = defaultPanelPositions();
  if (persisted?.openPanels) {
    for (const id of PANEL_IDS) {
      const v = persisted.openPanels[id];
      if (typeof v === "boolean") openPanels[id] = v;
    }
  }
  if (persisted?.panelPositions) {
    for (const id of PANEL_IDS) {
      const pos = persisted.panelPositions[id];
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        panelPositions[id] = { x: pos.x, y: pos.y };
      }
    }
  }
  const layers: LayerVisibility = {
    ...DEFAULT_LAYERS,
    ...persisted?.layers,
  };
  const basemapId = resolveBasemapId(persisted?.basemapId);
  // Dark-only: theme sync is permanently off (Light radio is disabled).
  return {
    openPanels,
    panelPositions,
    layers,
    basemapId,
    syncBasemapToUiTheme: false,
  };
}

export function MapUiProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  const [openPanels, setOpenPanels] = useState(defaultOpenPanels);
  const [panelPositions, setPanelPositions] = useState(defaultPanelPositions);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [basemapId, setBasemapIdState] = useState<BasemapId>(DEFAULT_BASEMAP_ID);
  const [syncBasemapToUiTheme, setSyncState] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCountryIso, setSelectedCountryIso] =
    useState<TrackedCountryIso | null>(null);
  const [focusedPanelId, setFocusedPanelId] = useState<PanelId | null>(null);

  useEffect(() => {
    const merged = mergeInitialState(readPersisted());
    setOpenPanels(merged.openPanels);
    setPanelPositions(merged.panelPositions);
    setLayers(merged.layers);
    setBasemapIdState(merged.basemapId);
    setSyncState(merged.syncBasemapToUiTheme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedMapUi = {
      openPanels,
      panelPositions,
      layers,
      basemapId,
      syncBasemapToUiTheme,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }, [
    hydrated,
    openPanels,
    panelPositions,
    layers,
    basemapId,
    syncBasemapToUiTheme,
  ]);

  // Theme → basemap sync disabled (Dark-only catalog).
  useEffect(() => {
    if (!hydrated || !syncBasemapToUiTheme) return;
    setBasemapIdState(basemapIdForUiTheme(resolvedTheme));
  }, [hydrated, syncBasemapToUiTheme, resolvedTheme]);

  const setPanelOpen = useCallback((id: PanelId, open: boolean) => {
    setOpenPanels((prev) => ({ ...prev, [id]: open }));
    if (open) {
      setFocusedPanelId(id);
      if (id === "country-stats") setSelectedCountryIso(null);
    }
    if (!open && id === "case-detail") setSelectedCaseId(null);
    if (!open && id === "country-stats") setSelectedCountryIso(null);
  }, []);

  const togglePanel = useCallback((id: PanelId) => {
    setOpenPanels((prev) => {
      const next = !prev[id];
      if (next) {
        setFocusedPanelId(id);
        if (id === "country-stats") setSelectedCountryIso(null);
      }
      if (!next && id === "case-detail") setSelectedCaseId(null);
      if (!next && id === "country-stats") setSelectedCountryIso(null);
      return { ...prev, [id]: next };
    });
  }, []);

  const setPanelPosition = useCallback((id: PanelId, position: PanelPosition) => {
    setPanelPositions((prev) => ({ ...prev, [id]: position }));
  }, []);

  const setLayerVisible = useCallback(
    (layer: keyof LayerVisibility, visible: boolean) => {
      setLayers((prev) => ({ ...prev, [layer]: visible }));
    },
    [],
  );

  const setBasemapId = useCallback((id: BasemapId) => {
    // Dark-only: ignore Light (and any other non-selectable id).
    const next = resolveBasemapId(id);
    setSyncState(false);
    setBasemapIdState(next);
  }, []);

  const setSyncBasemapToUiTheme = useCallback(
    (_sync: boolean) => {
      // Dark-only: keep sync off so Light cannot be selected via theme.
      setSyncState(false);
      setBasemapIdState(DEFAULT_BASEMAP_ID);
    },
    [],
  );

  const openCaseDetail = useCallback((caseId: string) => {
    setSelectedCaseId(caseId);
    setOpenPanels((prev) => ({ ...prev, "case-detail": true }));
    setFocusedPanelId("case-detail");
  }, []);

  const closeCaseDetail = useCallback(() => {
    setSelectedCaseId(null);
    setOpenPanels((prev) => ({ ...prev, "case-detail": false }));
  }, []);

  const openCountryStats = useCallback((iso?: TrackedCountryIso) => {
    setSelectedCountryIso(iso ?? null);
    setOpenPanels((prev) => ({ ...prev, "country-stats": true }));
    setFocusedPanelId("country-stats");
  }, []);

  const focusPanel = useCallback((id: PanelId) => {
    setFocusedPanelId(id);
  }, []);

  const value = useMemo<MapUiContextValue>(
    () => ({
      openPanels,
      panelPositions,
      layers,
      basemapId,
      syncBasemapToUiTheme,
      selectedCaseId,
      selectedCountryIso,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setLayerVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      openCaseDetail,
      closeCaseDetail,
      openCountryStats,
      focusPanel,
      basemapOptions: BASEMAPS,
    }),
    [
      openPanels,
      panelPositions,
      layers,
      basemapId,
      syncBasemapToUiTheme,
      selectedCaseId,
      selectedCountryIso,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setLayerVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      openCaseDetail,
      closeCaseDetail,
      openCountryStats,
      focusPanel,
    ],
  );

  return (
    <MapUiContext.Provider value={value}>{children}</MapUiContext.Provider>
  );
}

export function useMapUi() {
  const ctx = useContext(MapUiContext);
  if (!ctx) {
    throw new Error("useMapUi must be used within MapUiProvider");
  }
  return ctx;
}
