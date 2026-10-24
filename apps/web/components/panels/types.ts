import type { ComponentType } from "react";

/** Floating / docked data panels (country stats are a separate strip). */
export type PanelId = "case-detail";

export type PanelPosition = { x: number; y: number };

export type DataPanelDefinition = {
  id: PanelId;
  title: string;
  defaultOpen: boolean;
  defaultPosition: PanelPosition;
  Component: ComponentType;
};
