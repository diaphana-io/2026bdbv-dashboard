"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Rnd } from "react-rnd";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMapUi } from "../map-ui-context";
import { PANEL_DEFAULTS } from "./defaults";
import type { PanelId } from "./types";

type Props = {
  id: PanelId;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Optional accent (e.g. country flag color) tints header and left edge. */
  accentColor?: string;
};

/**
 * Common map floating panel: react-rnd + accent-tinted chrome.
 * See `./README.md` for the design contract.
 */
export function PanelFrame({
  id,
  title,
  children,
  className,
  contentClassName,
  accentColor,
}: Props) {
  const {
    panelPositions,
    panelSizes,
    setPanelLayout,
    setPanelOpen,
    focusPanel,
    focusedPanelId,
    persistPanelLayout,
  } = useMapUi();
  const position = panelPositions[id];
  const size = panelSizes[id] ?? PANEL_DEFAULTS[id].defaultSize;
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = hostRef.current?.offsetParent as HTMLElement | null;
    if (!parent || !position) return;
    const maxX = Math.max(0, parent.clientWidth - size.width);
    const maxY = Math.max(0, parent.clientHeight - size.height);
    if (position.x > maxX || position.y > maxY || position.x < 0 || position.y < 0) {
      setPanelLayout(
        id,
        {
          x: Math.min(Math.max(0, position.x), maxX),
          y: Math.min(Math.max(0, position.y), maxY),
        },
        size,
        persistPanelLayout,
      );
    }
  }, [id, persistPanelLayout, position, setPanelLayout, size]);

  const zIndex = focusedPanelId === id ? 40 : 30;

  const shellStyle: CSSProperties | undefined = accentColor
    ? {
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }
    : undefined;

  const headerStyle: CSSProperties | undefined = accentColor
    ? {
        backgroundColor: `color-mix(in oklab, ${accentColor} 42%, transparent)`,
      }
    : undefined;

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0">
      <Rnd
        size={{ width: size.width, height: size.height }}
        position={{ x: position.x, y: position.y }}
        bounds="parent"
        dragHandleClassName="panel-drag-handle"
        minWidth={240}
        minHeight={160}
        style={{ zIndex, pointerEvents: "auto" }}
        onDragStart={() => focusPanel(id)}
        onResizeStart={() => focusPanel(id)}
        onDragStop={(_e, d) => {
          setPanelLayout(id, { x: d.x, y: d.y }, size, persistPanelLayout);
        }}
        onResizeStop={(_e, _dir, ref, _delta, pos) => {
          setPanelLayout(
            id,
            { x: pos.x, y: pos.y },
            { width: ref.offsetWidth, height: ref.offsetHeight },
            persistPanelLayout,
          );
        }}
        className={cn("pointer-events-auto", className)}
      >
        <div
          className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card/95 shadow-md backdrop-blur"
          style={shellStyle}
          onPointerDown={() => focusPanel(id)}
        >
          <div
            className="panel-drag-handle flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-border/80 px-3 py-2 active:cursor-grabbing"
            style={headerStyle}
          >
            {accentColor ? (
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-black/15"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              />
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {title}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Close ${title}`}
              className="shrink-0 cursor-pointer"
              onClick={() => setPanelOpen(id, false)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <XIcon />
            </Button>
          </div>
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-3 pb-3",
              contentClassName,
            )}
          >
            {children}
          </div>
        </div>
      </Rnd>
    </div>
  );
}
