"use client";

import { useMapUi } from "../map-ui-context";
import { PANEL_REGISTRY } from "./registry";

export function PanelHost() {
  const { openPanels } = useMapUi();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {PANEL_REGISTRY.map((def) => {
        if (!openPanels[def.id]) return null;
        const { Component } = def;
        return <Component key={def.id} />;
      })}
    </div>
  );
}
