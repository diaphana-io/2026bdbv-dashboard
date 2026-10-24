"use client";

import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MapUiProvider } from "../map/map-ui-context";
import { PanelHost } from "../panels/panel-host";
import { MapSidebar } from "./map-sidebar";

export function MapShell({ children }: { children: ReactNode }) {
  return (
    <MapUiProvider>
      <TooltipProvider>
        <SidebarProvider className="h-svh !min-h-0 overflow-hidden">
          <MapSidebar />
          <SidebarInset className="relative h-svh min-h-0 flex-1 overflow-hidden md:h-svh">
            <div className="pointer-events-none absolute top-2 left-2 z-30">
              <SidebarTrigger className="pointer-events-auto bg-background/90 shadow-sm" />
            </div>
            <div className="absolute inset-0 min-h-0 w-full">{children}</div>
            <PanelHost />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </MapUiProvider>
  );
}
