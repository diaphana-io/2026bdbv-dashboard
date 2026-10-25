"use client";

import { useEffect, type ReactNode } from "react";
import { MapUiProvider } from "../map/map-ui-context";
import { PanelHost } from "../panels/panel-host";
import { AppShell } from "./app-shell";
import { MapSidebar } from "./map-sidebar";

/**
 * Map-first shell: locks document scroll and fills the viewport so the Navara
 * canvas owns pan/zoom instead of the browser scrollbar.
 */
export function MapShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

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
