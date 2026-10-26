import {
  TRACKED_COUNTRIES,
  statsPanelId,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";
import type { PanelId, PanelPosition, PanelSize } from "./types";

/**
 * Panel layout defaults — imported by map-ui-context (no Component imports)
 * to avoid circular deps with registry / panel bodies.
 */
export type PanelLayoutDefault = {
  defaultOpen: boolean;
  /** SSR / pre-hydrate fallback; prefer computeDefaultPanelPositions at runtime. */
  defaultPosition: PanelPosition;
  defaultSize: PanelSize;
};

const FALLBACK_VW = 1280;
const FALLBACK_VH = 800;

/** Clear floating sidebar (16rem) + inset padding, or minimal margin when offcanvas. */
export function sidebarClearancePx(vw: number): number {
  if (vw < 768) return 12;
  return Math.round(16 * 16) + 16; // 272
}

export function defaultStatsPosition(
  i: number,
  vw: number,
  vh: number,
): PanelPosition {
  const originX = sidebarClearancePx(vw);
  const aspect = vw / Math.max(vh, 1);
  const cols = aspect >= 1.25 ? 3 : 2;
  const dx = aspect >= 1.25 ? 24 : 16;
  const dy = vh < 700 ? 28 : 36;
  return {
    x: originX + (i % cols) * dx,
    y: 12 + Math.floor(i / cols) * dy,
  };
}

export function computeDefaultPanelPositions(
  vw: number = FALLBACK_VW,
  vh: number = FALLBACK_VH,
): Record<PanelId, PanelPosition> {
  const originX = sidebarClearancePx(vw);
  const out = {
    "case-detail": { x: originX, y: 12 },
  } as Record<PanelId, PanelPosition>;

  TRACKED_COUNTRIES.forEach((c, i) => {
    out[statsPanelId(c.iso)] = defaultStatsPosition(i, vw, vh);
  });

  return out;
}

function buildDefaults(): Record<PanelId, PanelLayoutDefault> {
  const positions = computeDefaultPanelPositions(FALLBACK_VW, FALLBACK_VH);
  const out = {
    "case-detail": {
      defaultOpen: false,
      defaultPosition: positions["case-detail"],
      defaultSize: { width: 320, height: 360 },
    },
  } as Record<PanelId, PanelLayoutDefault>;

  TRACKED_COUNTRIES.forEach((c) => {
    const id = statsPanelId(c.iso);
    out[id] = {
      defaultOpen: false,
      defaultPosition: positions[id],
      defaultSize: { width: 280, height: 220 },
    };
  });

  return out;
}

export const PANEL_DEFAULTS = buildDefaults();

export const PANEL_IDS = Object.keys(PANEL_DEFAULTS) as PanelId[];

export const DEFAULT_PANEL_SIZE: PanelSize = { width: 320, height: 360 };

export function isStatsPanelId(id: PanelId): boolean {
  return id.startsWith("stats-");
}

export function allStatsPanelIds(): PanelId[] {
  return TRACKED_COUNTRIES.map((c) => statsPanelId(c.iso as TrackedCountryIso));
}
