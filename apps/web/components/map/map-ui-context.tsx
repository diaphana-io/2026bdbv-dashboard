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
import {
  allStatsPanelIds,
  computeDefaultPanelPositions,
  PANEL_DEFAULTS,
  PANEL_IDS,
} from "./panels/defaults";
import type { PanelId, PanelPosition, PanelSize } from "./panels/types";
import {
  parseStatsPanelId,
  statsPanelId,
  TRACKED_COUNTRIES,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";

/**
 * v10: claims derived from open stats countries; viewport panel defaults.
 * v9: persistPanelLayout opt-in; panel sizes; react-rnd layout.
 */
const STORAGE_KEY = "bdbv-map-ui-v10";
const PREV_STORAGE_KEYS = [
  "bdbv-map-ui-v9",
  "bdbv-map-ui-v8",
  "bdbv-map-ui-v7",
  "bdbv-map-ui-v6",
  "bdbv-map-ui-v5",
  "bdbv-map-ui-v4",
  "bdbv-map-ui-v3",
] as const;

export type BoundaryLevel = "auto" | "admin1" | "admin2" | "admin3";

const BOUNDARY_LEVELS: readonly BoundaryLevel[] = [
  "auto",
  "admin1",
  "admin2",
  "admin3",
];

function resolveBoundaryLevel(value: unknown): BoundaryLevel {
  if (
    typeof value === "string" &&
    (BOUNDARY_LEVELS as readonly string[]).includes(value)
  ) {
    return value as BoundaryLevel;
  }
  return "auto";
}

export type LayerVisibility = {
  boundaries: boolean;
  countryNames: boolean;
  cities: boolean;
  cases: boolean;
  exposures: boolean;
  travels: boolean;
};

export type { PanelPosition, PanelSize };

type PersistedMapUi = {
  openPanels?: Partial<Record<PanelId, boolean>>;
  panelPositions?: Partial<Record<PanelId, PanelPosition>>;
  panelSizes?: Partial<Record<PanelId, PanelSize>>;
  persistPanelLayout?: boolean;
  layers?: Partial<LayerVisibility> & { claims?: boolean };
  basemapId?: BasemapId;
  syncBasemapToUiTheme?: boolean;
  boundaryLevel?: BoundaryLevel;
  uiFontSize?: UiFontSize;
};

export type UiFontSize = "sm" | "md" | "lg";

const FONT_SIZE_PX: Record<UiFontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

type MapUiContextValue = {
  openPanels: Record<PanelId, boolean>;
  panelPositions: Record<PanelId, PanelPosition>;
  panelSizes: Record<PanelId, PanelSize>;
  persistPanelLayout: boolean;
  layers: LayerVisibility;
  /** Country ISOs with an open Case Stats panel — drives claims dots. */
  enabledStatsIsos: TrackedCountryIso[];
  basemapId: BasemapId;
  syncBasemapToUiTheme: boolean;
  boundaryLevel: BoundaryLevel;
  uiFontSize: UiFontSize;
  selectedCaseId: string | null;
  focusedPanelId: PanelId | null;
  setPanelOpen: (id: PanelId, open: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  setPanelLayout: (
    id: PanelId,
    position: PanelPosition,
    size: PanelSize,
    persist: boolean,
  ) => void;
  setPersistPanelLayout: (persist: boolean) => void;
  resetPanelPositions: () => void;
  setLayerVisible: (layer: keyof LayerVisibility, visible: boolean) => void;
  setBasemapId: (id: BasemapId) => void;
  setSyncBasemapToUiTheme: (sync: boolean) => void;
  setBoundaryLevel: (level: BoundaryLevel) => void;
  setUiFontSize: (size: UiFontSize) => void;
  openCaseDetail: (caseId: string) => void;
  closeCaseDetail: () => void;
  /** Open one country's stats panel (activates Case Stats group). */
  openCountryStats: (iso: TrackedCountryIso) => void;
  setStatsPanelOpen: (iso: TrackedCountryIso, open: boolean) => void;
  /** Enable Case Tracking group; turns off Case Stats panels. */
  activateCaseTracking: () => void;
  /** Enable Case Stats group; turns off Case Tracking panels + case layers. */
  activateCaseStats: () => void;
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

function defaultPanelPositions(
  vw?: number,
  vh?: number,
): Record<PanelId, PanelPosition> {
  if (
    typeof vw === "number" &&
    typeof vh === "number" &&
    Number.isFinite(vw) &&
    Number.isFinite(vh)
  ) {
    return computeDefaultPanelPositions(vw, vh);
  }
  const out = {} as Record<PanelId, PanelPosition>;
  for (const id of PANEL_IDS) {
    out[id] = { ...PANEL_DEFAULTS[id].defaultPosition };
  }
  return out;
}

function defaultPanelSizes(): Record<PanelId, PanelSize> {
  const out = {} as Record<PanelId, PanelSize>;
  for (const id of PANEL_IDS) {
    out[id] = { ...PANEL_DEFAULTS[id].defaultSize };
  }
  return out;
}

/** Match Case Stats default (stats-CD open): Case Tracking layers off. */
const DEFAULT_LAYERS: LayerVisibility = {
  boundaries: true,
  countryNames: true,
  cities: true,
  cases: false,
  exposures: false,
  travels: false,
};

function resolveUiFontSize(value: unknown): UiFontSize {
  if (value === "sm" || value === "md" || value === "lg") return value;
  return "md";
}

function stripClaimsFromLayers(
  layers: (Partial<LayerVisibility> & { claims?: boolean }) | undefined,
): Partial<LayerVisibility> {
  if (!layers) return {};
  const { claims: _claims, ...rest } = layers;
  return rest;
}

function enabledStatsIsosFromPanels(
  openPanels: Record<PanelId, boolean>,
): TrackedCountryIso[] {
  const out: TrackedCountryIso[] = [];
  for (const country of TRACKED_COUNTRIES) {
    if (openPanels[statsPanelId(country.iso)]) {
      out.push(country.iso);
    }
  }
  return out;
}

function readPersisted(): PersistedMapUi | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of PREV_STORAGE_KEYS) {
        raw = window.localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedMapUi;
    return {
      ...parsed,
      basemapId: resolveBasemapId(parsed.basemapId),
      syncBasemapToUiTheme: false,
      boundaryLevel: resolveBoundaryLevel(parsed.boundaryLevel),
      persistPanelLayout: parsed.persistPanelLayout === true,
      uiFontSize: resolveUiFontSize(parsed.uiFontSize),
      layers: {
        ...stripClaimsFromLayers(parsed.layers),
        boundaries: true,
      },
    };
  } catch {
    return null;
  }
}

function mergeInitialState(persisted: PersistedMapUi | null) {
  const openPanels = defaultOpenPanels();
  const vw =
    typeof window !== "undefined" ? window.innerWidth : undefined;
  const vh =
    typeof window !== "undefined" ? window.innerHeight : undefined;
  const panelPositions = defaultPanelPositions(vw, vh);
  const panelSizes = defaultPanelSizes();
  if (persisted?.openPanels) {
    for (const id of PANEL_IDS) {
      const v = persisted.openPanels[id];
      if (typeof v === "boolean") openPanels[id] = v;
    }
  }
  const loadLayout = persisted?.persistPanelLayout === true;
  if (loadLayout && persisted?.panelPositions) {
    for (const id of PANEL_IDS) {
      const pos = persisted.panelPositions[id];
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        panelPositions[id] = { x: pos.x, y: pos.y };
      }
    }
  }
  if (loadLayout && persisted?.panelSizes) {
    for (const id of PANEL_IDS) {
      const sz = persisted.panelSizes[id];
      if (
        sz &&
        Number.isFinite(sz.width) &&
        Number.isFinite(sz.height) &&
        sz.width > 0 &&
        sz.height > 0
      ) {
        panelSizes[id] = { width: sz.width, height: sz.height };
      }
    }
  }
  const layers: LayerVisibility = {
    ...DEFAULT_LAYERS,
    ...stripClaimsFromLayers(persisted?.layers),
  };
  return {
    openPanels,
    panelPositions,
    panelSizes,
    persistPanelLayout: loadLayout,
    layers,
    basemapId: resolveBasemapId(persisted?.basemapId),
    syncBasemapToUiTheme: false,
    boundaryLevel: resolveBoundaryLevel(persisted?.boundaryLevel),
    uiFontSize: resolveUiFontSize(persisted?.uiFontSize),
  };
}

export function MapUiProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  const [openPanels, setOpenPanels] = useState(defaultOpenPanels);
  const [panelPositions, setPanelPositions] = useState(defaultPanelPositions);
  const [panelSizes, setPanelSizes] = useState(defaultPanelSizes);
  const [persistPanelLayout, setPersistPanelLayoutState] = useState(false);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [basemapId, setBasemapIdState] = useState<BasemapId>(DEFAULT_BASEMAP_ID);
  const [syncBasemapToUiTheme, setSyncState] = useState(false);
  const [boundaryLevel, setBoundaryLevelState] =
    useState<BoundaryLevel>("auto");
  const [uiFontSize, setUiFontSizeState] = useState<UiFontSize>("md");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [focusedPanelId, setFocusedPanelId] = useState<PanelId | null>(null);

  useEffect(() => {
    const merged = mergeInitialState(readPersisted());
    setOpenPanels(merged.openPanels);
    setPanelPositions(merged.panelPositions);
    setPanelSizes(merged.panelSizes);
    setPersistPanelLayoutState(merged.persistPanelLayout);
    setLayers(merged.layers);
    setBasemapIdState(merged.basemapId);
    setSyncState(merged.syncBasemapToUiTheme);
    setBoundaryLevelState(merged.boundaryLevel);
    setUiFontSizeState(merged.uiFontSize);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.fontSize = FONT_SIZE_PX[uiFontSize];
  }, [hydrated, uiFontSize]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedMapUi = {
      openPanels,
      layers,
      basemapId,
      syncBasemapToUiTheme,
      boundaryLevel,
      persistPanelLayout,
      uiFontSize,
      ...(persistPanelLayout
        ? { panelPositions, panelSizes }
        : {}),
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
    panelSizes,
    persistPanelLayout,
    layers,
    basemapId,
    syncBasemapToUiTheme,
    boundaryLevel,
    uiFontSize,
  ]);

  useEffect(() => {
    if (!hydrated || !syncBasemapToUiTheme) return;
    setBasemapIdState(basemapIdForUiTheme(resolvedTheme));
  }, [hydrated, syncBasemapToUiTheme, resolvedTheme]);

  // Recompute default panel positions on resize when layout is not persisted.
  useEffect(() => {
    if (!hydrated || persistPanelLayout) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      setPanelPositions(
        computeDefaultPanelPositions(window.innerWidth, window.innerHeight),
      );
    };
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) clearTimeout(timer);
    };
  }, [hydrated, persistPanelLayout]);

  const setPanelOpen = useCallback((id: PanelId, open: boolean) => {
    setOpenPanels((prev) => ({ ...prev, [id]: open }));
    if (open) setFocusedPanelId(id);
    if (!open && id === "case-detail") setSelectedCaseId(null);
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

  const setPanelLayout = useCallback(
    (
      id: PanelId,
      position: PanelPosition,
      size: PanelSize,
      _persist: boolean,
    ) => {
      setPanelPositions((prev) => ({ ...prev, [id]: position }));
      setPanelSizes((prev) => ({ ...prev, [id]: size }));
    },
    [],
  );

  const setPersistPanelLayout = useCallback((persist: boolean) => {
    setPersistPanelLayoutState(persist);
  }, []);

  const resetPanelPositions = useCallback(() => {
    setPanelPositions(
      computeDefaultPanelPositions(window.innerWidth, window.innerHeight),
    );
    setPanelSizes(defaultPanelSizes());
  }, []);

  const setLayerVisible = useCallback(
    (layer: keyof LayerVisibility, visible: boolean) => {
      setLayers((prev) => ({ ...prev, [layer]: visible }));
    },
    [],
  );

  const setBasemapId = useCallback((id: BasemapId) => {
    const next = resolveBasemapId(id);
    setSyncState(false);
    setBasemapIdState(next);
  }, []);

  const setSyncBasemapToUiTheme = useCallback((_sync: boolean) => {
    setSyncState(false);
    setBasemapIdState(DEFAULT_BASEMAP_ID);
  }, []);

  const setBoundaryLevel = useCallback((level: BoundaryLevel) => {
    setBoundaryLevelState(resolveBoundaryLevel(level));
  }, []);

  const setUiFontSize = useCallback((size: UiFontSize) => {
    setUiFontSizeState(resolveUiFontSize(size));
  }, []);

  const activateCaseTracking = useCallback(() => {
    setOpenPanels((prev) => {
      const next = { ...prev };
      for (const id of allStatsPanelIds()) next[id] = false;
      return next;
    });
  }, []);

  const activateCaseStats = useCallback(() => {
    setOpenPanels((prev) => ({ ...prev, "case-detail": false }));
    setSelectedCaseId(null);
    setLayers((prev) => ({
      ...prev,
      cases: false,
      exposures: false,
      travels: false,
    }));
  }, []);

  const openCaseDetail = useCallback((caseId: string) => {
    activateCaseTracking();
    setSelectedCaseId(caseId);
    setOpenPanels((prev) => ({ ...prev, "case-detail": true }));
    setFocusedPanelId("case-detail");
  }, [activateCaseTracking]);

  const closeCaseDetail = useCallback(() => {
    setSelectedCaseId(null);
    setOpenPanels((prev) => ({ ...prev, "case-detail": false }));
  }, []);

  const openCountryStats = useCallback((iso: TrackedCountryIso) => {
    activateCaseStats();
    const id = statsPanelId(iso);
    setOpenPanels((prev) => ({ ...prev, [id]: true }));
    setFocusedPanelId(id);
  }, [activateCaseStats]);

  const setStatsPanelOpen = useCallback(
    (iso: TrackedCountryIso, open: boolean) => {
      if (open) activateCaseStats();
      const id = statsPanelId(iso);
      setOpenPanels((prev) => ({ ...prev, [id]: open }));
      if (open) setFocusedPanelId(id);
    },
    [activateCaseStats],
  );

  const focusPanel = useCallback((id: PanelId) => {
    setFocusedPanelId(id);
  }, []);

  const enabledStatsIsos = useMemo(
    () => enabledStatsIsosFromPanels(openPanels),
    [openPanels],
  );

  const value = useMemo<MapUiContextValue>(
    () => ({
      openPanels,
      panelPositions,
      panelSizes,
      persistPanelLayout,
      layers,
      enabledStatsIsos,
      basemapId,
      syncBasemapToUiTheme,
      boundaryLevel,
      uiFontSize,
      selectedCaseId,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setPanelLayout,
      setPersistPanelLayout,
      resetPanelPositions,
      setLayerVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      setBoundaryLevel,
      setUiFontSize,
      openCaseDetail,
      closeCaseDetail,
      openCountryStats,
      setStatsPanelOpen,
      activateCaseTracking,
      activateCaseStats,
      focusPanel,
      basemapOptions: BASEMAPS,
    }),
    [
      openPanels,
      panelPositions,
      panelSizes,
      persistPanelLayout,
      layers,
      enabledStatsIsos,
      basemapId,
      syncBasemapToUiTheme,
      boundaryLevel,
      uiFontSize,
      selectedCaseId,
      focusedPanelId,
      setPanelOpen,
      togglePanel,
      setPanelPosition,
      setPanelLayout,
      setPersistPanelLayout,
      resetPanelPositions,
      setLayerVisible,
      setBasemapId,
      setSyncBasemapToUiTheme,
      setBoundaryLevel,
      setUiFontSize,
      openCaseDetail,
      closeCaseDetail,
      openCountryStats,
      setStatsPanelOpen,
      activateCaseTracking,
      activateCaseStats,
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

/** @deprecated Prefer enabledStatsIsosFromPanels via context; kept for tests. */
export function resolveEnabledStatsIsos(
  openPanels: Record<string, boolean>,
): TrackedCountryIso[] {
  const out: TrackedCountryIso[] = [];
  for (const id of Object.keys(openPanels)) {
    if (!openPanels[id]) continue;
    const iso = parseStatsPanelId(id);
    if (iso) out.push(iso);
  }
  return out;
}
