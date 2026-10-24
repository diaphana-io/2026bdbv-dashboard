"use client";

import type { ReactNode } from "react";
import { MapUiProvider } from "../map/map-ui-context";
import { PanelHost } from "../panels/panel-host";
import { AppShell } from "./app-shell";
import { MapSidebar } from "./map-sidebar";

export function MapShell({ children }: { children: ReactNode }) {
  return (
    <MapUiProvider>
      <AppShell
        variant="map"
        sidebar={<MapSidebar />}
        insetOverlay={<PanelHost />}
      >
        {children}
      </AppShell>
    </MapUiProvider>
  );
}
