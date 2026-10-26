"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { PanelPosition } from "./types";

const PANEL_MIN_VISIBLE = 48;

type Bounds = { width: number; height: number };

function clampPosition(
  pos: PanelPosition,
  panelSize: { width: number; height: number },
  bounds: Bounds,
): PanelPosition {
  const maxX = Math.max(0, bounds.width - PANEL_MIN_VISIBLE);
  const maxY = Math.max(0, bounds.height - PANEL_MIN_VISIBLE);
  const minX = Math.min(0, bounds.width - panelSize.width);
  const minY = Math.min(0, bounds.height - panelSize.height);
  return {
    x: Math.min(maxX, Math.max(minX, pos.x)),
    y: Math.min(maxY, Math.max(minY, pos.y)),
  };
}

export function usePanelDrag(options: {
  position: PanelPosition;
  onMove: (next: PanelPosition) => void;
  boundsRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const { position, onMove, boundsRef, panelRef } = options;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
      };
      e.preventDefault();
    },
    [position.x, position.y],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const bounds = boundsRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      const next = {
        x: drag.originX + (e.clientX - drag.startX),
        y: drag.originY + (e.clientY - drag.startY),
      };
      if (bounds && panel) {
        onMove(
          clampPosition(
            next,
            { width: panel.width, height: panel.height },
            { width: bounds.width, height: bounds.height },
          ),
        );
      } else {
        onMove(next);
      }
    },
    [boundsRef, onMove, panelRef],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const clampToBounds = useCallback(
    (pos: PanelPosition): PanelPosition => {
      const bounds = boundsRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!bounds || !panel) return pos;
      return clampPosition(
        pos,
        { width: panel.width, height: panel.height },
        { width: bounds.width, height: bounds.height },
      );
    },
    [boundsRef, panelRef],
  );

  return { onPointerDown, onPointerMove, onPointerUp, clampToBounds };
}
