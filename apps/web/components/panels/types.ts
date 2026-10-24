import type { ComponentType } from "react";

export type PanelId = "country-stats" | "case-detail";

export type PanelPosition = { x: number; y: number };

export type DataPanelDefinition = {
  id: PanelId;
  title: string;
  defaultOpen: boolean;
  defaultPosition: PanelPosition;
  Component: ComponentType;
};
