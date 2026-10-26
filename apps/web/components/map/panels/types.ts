import type { ComponentType } from "react";
import type { StatsPanelId } from "@/lib/tracked-countries";

/** Floating / docked data panels. */
export type PanelId = "case-detail" | StatsPanelId;

export type PanelPosition = { x: number; y: number };

export type PanelSize = { width: number; height: number };

export type DataPanelDefinition = {
  id: PanelId;
  title: string;
  defaultOpen: boolean;
  defaultPosition: PanelPosition;
  defaultSize?: PanelSize;
  Component: ComponentType;
};
