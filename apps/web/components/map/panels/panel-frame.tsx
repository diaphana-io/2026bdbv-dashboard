"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Rnd } from "react-rnd";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  /** Optional accent (e.g. country flag color) as left border — not a nested card. */
  accentColor?: string;
};

/**
 * Common map floating panel: react-rnd + shadcn Card.
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
  const boundsRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    boundsRef.current = hostRef.current?.offsetParent as HTMLElement | null;
  });

  const zIndex = focusedPanelId === id ? 40 : 30;

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
        <Card
          size="sm"
          className="flex h-full flex-col bg-card/95 shadow-md backdrop-blur"
          style={
            accentColor
              ? ({ borderLeftWidth: 3, borderLeftColor: accentColor } as CSSProperties)
              : undefined
          }
          onPointerDown={() => focusPanel(id)}
        >
          <CardHeader className="panel-drag-handle shrink-0 cursor-grab touch-none select-none border-b active:cursor-grabbing">
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Close ${title}`}
                className="cursor-pointer"
                onClick={() => setPanelOpen(id, false)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <XIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              contentClassName,
            )}
          >
            {children}
          </CardContent>
        </Card>
      </Rnd>
    </div>
  );
}
