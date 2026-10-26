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
  defaultPosition: PanelPosition;
  defaultSize: PanelSize;
};

function buildDefaults(): Record<PanelId, PanelLayoutDefault> {
  const out = {
    "case-detail": {
      defaultOpen: false,
      defaultPosition: { x: 10_000, y: 12 },
      defaultSize: { width: 320, height: 360 },
    },
  } as Record<PanelId, PanelLayoutDefault>;

  TRACKED_COUNTRIES.forEach((c, i) => {
    const id = statsPanelId(c.iso);
    out[id] = {
      defaultOpen: false,
      defaultPosition: { x: 12 + (i % 3) * 24, y: 12 + Math.floor(i / 3) * 36 },
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
