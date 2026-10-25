"use client";

import { useEffect, type ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MapUiProvider } from "../map/map-ui-context";
import { PanelHost } from "../panels/panel-host";
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
      <TooltipProvider>
        <SidebarProvider className="h-svh max-h-svh !min-h-0 overflow-hidden">
          <MapSidebar />
          <SidebarInset className="relative h-svh max-h-svh min-h-0 flex-1 overflow-hidden md:h-svh">
            <div className="pointer-events-none absolute top-2 left-2 z-30">
              <SidebarTrigger className="pointer-events-auto bg-background/90 shadow-sm" />
            </div>
            <div className="absolute inset-0 min-h-0 w-full overflow-hidden">
              {children}
            </div>
            <PanelHost />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </MapUiProvider>
  );
}
