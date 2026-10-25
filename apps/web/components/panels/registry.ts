import { CaseDetailPanel } from "./case-detail-panel";
import { CountryStatsPanel } from "./country-stats-panel";
import type { DataPanelDefinition } from "./types";

/** Ordered panel definitions — add a panel = one file + one entry here. */
export const PANEL_REGISTRY: DataPanelDefinition[] = [
  {
    id: "country-stats",
    title: "Country statistics",
    defaultOpen: false,
    defaultPosition: { x: 12, y: 12 },
    Component: CountryStatsPanel,
  },
  {
    id: "case-detail",
    title: "Case detail",
    defaultOpen: false,
    defaultPosition: { x: 10_000, y: 12 },
    Component: CaseDetailPanel,
  },
];
