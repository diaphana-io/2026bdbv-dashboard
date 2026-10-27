"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMapUi } from "./map-ui-context";

const TOAST_ID = "case-stats-dots-disclaimer";

const TITLE = "About case dots";
const DESCRIPTION =
  "Case dots are randomly drawn within the data area and do not show the precise location of each case.";

/**
 * Bottom disclaimer while any Case Stats country is on.
 * Dismiss with Got it; shows again after all countries are turned off then on.
 */
export function CaseStatsDotsDisclaimer() {
  const { enabledStatsIsos } = useMapUi();
  const dismissedWhileOpenRef = useRef(false);
  const statsOn = enabledStatsIsos.length > 0;

  useEffect(() => {
    if (!statsOn) {
      dismissedWhileOpenRef.current = false;
      toast.dismiss(TOAST_ID);
      return;
    }
    if (dismissedWhileOpenRef.current) return;

    toast.info(TITLE, {
      id: TOAST_ID,
      description: DESCRIPTION,
      duration: Infinity,
      position: "bottom-right",
      action: {
        label: "Got it",
        onClick: () => {
          dismissedWhileOpenRef.current = true;
          toast.dismiss(TOAST_ID);
        },
      },
      onDismiss: () => {
        dismissedWhileOpenRef.current = true;
      },
    });
  }, [statsOn]);

  return null;
}
