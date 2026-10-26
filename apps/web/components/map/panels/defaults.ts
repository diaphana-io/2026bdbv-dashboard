import type { PanelId, PanelPosition, PanelSize } from "./types";

/**
 * Panel layout defaults — imported by map-ui-context (no Component imports)
 * to avoid circular deps with registry / panel bodies.
 */
export type PanelLayoutDefault = {
  defaultOpen: boolean;
  defaultPosition: PanelPosition;
  defaultSize: PanelSize;
};

export const PANEL_DEFAULTS: Record<PanelId, PanelLayoutDefault> = {
  "country-stats": {
    defaultOpen: false,
    defaultPosition: { x: 12, y: 12 },
    defaultSize: { width: 320, height: 420 },
  },
  "case-detail": {
    defaultOpen: false,
    defaultPosition: { x: 10_000, y: 12 },
    defaultSize: { width: 320, height: 360 },
  },
};

export const PANEL_IDS = Object.keys(PANEL_DEFAULTS) as PanelId[];

export const DEFAULT_PANEL_SIZE: PanelSize = { width: 320, height: 360 };
