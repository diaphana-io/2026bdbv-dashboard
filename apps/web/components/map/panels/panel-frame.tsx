"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
import type { PanelId } from "./types";
import { usePanelDrag } from "./use-panel-drag";

type Props = {
  id: PanelId;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PanelFrame({
  id,
  title,
  children,
  className,
  contentClassName,
}: Props) {
  const {
    panelPositions,
    setPanelPosition,
    setPanelOpen,
    focusPanel,
    focusedPanelId,
  } = useMapUi();
  const position = panelPositions[id];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    boundsRef.current = wrapperRef.current?.offsetParent as HTMLElement | null;
  });

  const { onPointerDown, onPointerMove, onPointerUp, clampToBounds } =
    usePanelDrag({
      position,
      onMove: (next) => setPanelPosition(id, next),
      boundsRef,
      panelRef: wrapperRef,
    });

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      boundsRef.current = wrapperRef.current
        ?.offsetParent as HTMLElement | null;
      const clamped = clampToBounds(position);
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPanelPosition(id, clamped);
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first layout pass only
  }, [id]);

  const zIndex = focusedPanelId === id ? 40 : 30;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "pointer-events-auto absolute w-80 max-w-[calc(100%-1.5rem)]",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        zIndex,
      }}
      onPointerDown={() => focusPanel(id)}
    >
      <Card size="sm" className="bg-card/95 shadow-md backdrop-blur">
        <CardHeader className="cursor-grab touch-none select-none border-b active:cursor-grabbing">
          <CardTitle
            className="text-sm"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {title}
          </CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Close ${title}`}
              onClick={() => setPanelOpen(id, false)}
            >
              <XIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent
          className={cn("max-h-[70vh] overflow-y-auto", contentClassName)}
        >
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
