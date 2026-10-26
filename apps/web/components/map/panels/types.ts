import type { ComponentType } from "react";

/** Floating / docked data panels. */
export type PanelId = "case-detail" | "country-stats";

export type PanelPosition = { x: number; y: number };

export type DataPanelDefinition = {
  id: PanelId;
  title: string;
  defaultOpen: boolean;
  defaultPosition: PanelPosition;
  Component: ComponentType;
};
