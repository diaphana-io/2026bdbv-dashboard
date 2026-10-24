import { CaseDetailPanel } from "./case-detail-panel";
import type { DataPanelDefinition } from "./types";

/** Ordered panel definitions — add a panel = one file + one entry here. */
export const PANEL_REGISTRY: DataPanelDefinition[] = [
  {
    id: "case-detail",
    title: "Case detail",
    defaultOpen: false,
    defaultPosition: { x: 10_000, y: 12 },
    Component: CaseDetailPanel,
  },
];
