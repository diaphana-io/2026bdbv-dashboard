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
  type BasemapId,
  basemapIdForUiTheme,
  resolveBasemapId,
} from "./basemap-style";
import type { PanelId, PanelPosition } from "../panels/types";
import {
  defaultCountryStatsVisibility,
  isTrackedCountryIso,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";

const STORAGE_KEY = "bdbv-map-ui-v2";

/** Defaults live here (not registry) to avoid circular imports with panel components. */
const PANEL_DEFAULTS: Record<
  PanelId,
  { defaultOpen: boolean; defaultPosition: PanelPosition }
> = {
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

export type CountryStatsVisibility = Record<TrackedCountryIso, boolean>;

export type { PanelPosition };

type PersistedMapUi = {
  openPanels?: Partial<Record<PanelId, boolean>>;
  panelPositions?: Partial<Record<PanelId, PanelPosition>>;
  layers?: Partial<LayerVisibility>;
  countryStatsVisible?: Partial<CountryStatsVisibility>;
  basemapId?: BasemapId;
  syncBasemapToUiTheme?: boolean;
};

type MapUiContextValue = {
  openPanels: Record<PanelId, boolean>;
  panelPositions: Record<PanelId, PanelPosition>;
  layers: LayerVisibility;
  countryStatsVisible: CountryStatsVisibility;
  basemapId: BasemapId;
  syncBasemapToUiTheme: boolean;
  selectedCaseId: string | null;
  focusedPanelId: PanelId | null;
  setPanelOpen: (id: PanelId, open: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  setLayerVisible: (layer: keyof LayerVisibility, visible: boolean) => void;
  setCountryStatsVisible: (iso: TrackedCountryIso, visible: boolean) => void;
  setBasemapId: (id: BasemapId) => void;
  setSyncBasemapToUiTheme: (sync: boolean) => void;
  openCaseDetail: (caseId: string) => void;
  closeCaseDetail: () => void;
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedMapUi;
  } catch {
    return null;
  }
}

function mergeCountryStats(
  persisted?: Partial<CountryStatsVisibility>,
): CountryStatsVisibility {
  const out = defaultCountryStatsVisibility();
  if (!persisted) return out;
  for (const [iso, visible] of Object.entries(persisted)) {
    if (isTrackedCountryIso(iso) && typeof visible === "boolean") {
      out[iso] = visible;
    }
  }
  return out;
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
  const countryStatsVisible = mergeCountryStats(persisted?.countryStatsVisible);
  const basemapId = resolveBasemapId(persisted?.basemapId);
  const syncBasemapToUiTheme = persisted?.syncBasemapToUiTheme ?? true;
  return {
    openPanels,
    panelPositions,
    layers,
    countryStatsVisible,
    basemapId,
    syncBasemapToUiTheme,
  };
}

export function MapUiProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  const [openPanels, setOpenPanels] = useState(defaultOpenPanels);
  const [panelPositions, setPanelPositions] = useState(defaultPanelPositions);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [countryStatsVisible, setCountryStatsState] = useState(
    defaultCountryStatsVisibility,
  );
  const [basemapId, setBasemapIdState] = useState<BasemapId>("natural-earth");
  const [syncBasemapToUiTheme, setSyncState] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [focusedPanelId, setFocusedPanelId] = useState<PanelId | null>(null);

  useEffect(() => {
    const merged = mergeInitialState(readPersisted());
    setOpenPanels(merged.openPanels);
    setPanelPositions(merged.panelPositions);
    setLayers(merged.layers);
    setCountryStatsState(merged.countryStatsVisible);
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
      countryStatsVisible,
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
    countryStatsVisible,
    basemapId,
    syncBasemapToUiTheme,
  ]);

  useEffect(() => {
    if (!hydrated || !syncBasemapToUiTheme) return;
    setBasemapIdState(basemapIdForUiTheme(resolvedTheme));
  }, [hydrated, syncBasemapToUiTheme, resolvedTheme]);

  const setPanelOpen = useCallback((id: PanelId, open: boolean) => {
    setOpenPanels((prev) => ({ ...prev, [id]: open }));
    if (open) setFocusedPanelId(id);
    if (!open && id === "case-detail") {
      setSelectedCaseId(null);
    }
  }, []);

  const togglePanel = useCallback((id: PanelId) => {
    setOpenPanels((prev) => {
      const next = !prev[id];
      if (next) setFocusedPanelId(id);
      if (!next && id === "case-detail") setSelectedCaseId(null);
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

  const setCountryStatsVisible = useCallback(
    (iso: TrackedCountryIso, visible: boolean) => {
      setCountryStatsState((prev) => ({ ...prev, [iso]: visible }));
    },
    [],
  );

  const setBasemapId = useCallback((id: BasemapId) => {
    setBasemapIdState(id);
  }, []);

  const setSyncBasemapToUiTheme = useCallback(
    (sync: boolean) => {
      setSyncState(sync);
      if (sync) {
        setBasemapIdState(basemapIdForUiTheme(resolvedTheme));
      }
    },
    [resolvedTheme],
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

  const focusPanel = useCallback((id: PanelId) => {
    setFocusedPanelId(id);
  }, []);

  const value = useMemo<MapUiContextValue>(
    () => ({
      openPanels,
      panelPositions,
      layers,
      countryStatsVisible,
      basemapId,
      syncBasemapToUiTheme,
      selectedCaseId,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setLayerVisible,
      setCountryStatsVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      openCaseDetail,
      closeCaseDetail,
      focusPanel,
      basemapOptions: BASEMAPS,
    }),
    [
      openPanels,
      panelPositions,
      layers,
      countryStatsVisible,
      basemapId,
      syncBasemapToUiTheme,
      selectedCaseId,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setLayerVisible,
      setCountryStatsVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      openCaseDetail,
      closeCaseDetail,
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
