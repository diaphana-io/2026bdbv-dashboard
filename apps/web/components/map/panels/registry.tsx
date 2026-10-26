import { TRACKED_COUNTRIES, statsPanelId } from "@/lib/tracked-countries";
import { CaseDetailPanel } from "./case-detail-panel";
import { CountryStatPanel } from "./country-stat-panel";
import { PANEL_DEFAULTS } from "./defaults";
import type { DataPanelDefinition } from "./types";

/** Ordered panel definitions — add a panel = one file + one entry here. */
export const PANEL_REGISTRY: DataPanelDefinition[] = [
  ...TRACKED_COUNTRIES.map((c) => {
    const id = statsPanelId(c.iso);
    const def = PANEL_DEFAULTS[id];
    return {
      id,
      title: c.shortName,
      defaultOpen: def.defaultOpen,
      defaultPosition: def.defaultPosition,
      defaultSize: def.defaultSize,
      Component: function StatsPanelForCountry() {
        return <CountryStatPanel iso={c.iso} />;
      },
    } satisfies DataPanelDefinition;
  }),
  {
    id: "case-detail",
    title: "Case detail",
    defaultOpen: PANEL_DEFAULTS["case-detail"].defaultOpen,
    defaultPosition: PANEL_DEFAULTS["case-detail"].defaultPosition,
    defaultSize: PANEL_DEFAULTS["case-detail"].defaultSize,
    Component: CaseDetailPanel,
  },
];
