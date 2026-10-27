"use client";

import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BrandLink } from "./brand-link";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /**
   * `map` — fullscreen inset with floating trigger (outbreak map).
   * `page` — scrollable main with a top bar trigger (curate console).
   */
  variant?: "map" | "page";
  /** Extra nodes inside the map inset (e.g. floating panels). */
  insetOverlay?: ReactNode;
};

/**
 * Shared SidebarProvider + inset chrome used by Map and Curate.
 * Sidebar content is injected; layout chrome stays one component.
 */
export function AppShell({
  sidebar,
  children,
  variant = "page",
  insetOverlay,
}: AppShellProps) {
  const isMap = variant === "map";

  return (
    <TooltipProvider>
      <SidebarProvider
        className={cn(
          isMap &&
            "h-svh max-h-svh !min-h-0 overflow-hidden [&_[data-slot=sidebar-gap]]:!w-0",
        )}
      >
        {sidebar}
        <AppShellInset isMap={isMap} insetOverlay={insetOverlay}>
          {children}
        </AppShellInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AppShellInset({
  isMap,
  insetOverlay,
  children,
}: {
  isMap: boolean;
  insetOverlay?: ReactNode;
  children: ReactNode;
}) {
  const { open, openMobile, isMobile } = useSidebar();
  const sidebarVisible = isMobile ? openMobile : open;

  return (
    <SidebarInset
      className={cn(
        isMap
          ? "relative h-svh max-h-svh min-h-0 flex-1 overflow-hidden md:h-svh"
          : "flex min-h-svh flex-1 flex-col",
      )}
    >
      {isMap ? (
        <>
          {!sidebarVisible && (
            <div className="pointer-events-none absolute top-2 left-2 z-30">
              <SidebarTrigger className="pointer-events-auto bg-background/90 shadow-sm" />
            </div>
          )}
          <div className="absolute inset-0 min-h-0 w-full overflow-hidden">
            {children}
          </div>
          {insetOverlay}
        </>
      ) : (
        <>
          {!sidebarVisible && (
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
              <SidebarTrigger />
              <BrandLink className="min-w-0" />
            </header>
          )}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </>
      )}
    </SidebarInset>
  );
}
