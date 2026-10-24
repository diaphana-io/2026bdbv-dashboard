"use client";

import { useEffect, useState } from "react";
import type { CaseDetail } from "@/lib/data-types";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useMapUi } from "../map/map-ui-context";
import { PanelFrame } from "./panel-frame";

export function CaseDetailPanel() {
  const { selectedCaseId } = useMapUi();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCaseId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load(caseId: string) {
      setLoading(true);
      setDetail(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_BASE_PATH ?? ""}/api/map/case?id=${encodeURIComponent(caseId)}`,
        );
        if (!res.ok || cancelled) return;
        setDetail((await res.json()) as CaseDetail);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(selectedCaseId);
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId]);

  return (
    <PanelFrame
      id="case-detail"
      title={detail?.visual_id ?? "Case detail"}
      contentClassName="pt-2"
    >
      {!selectedCaseId ? (
        <p className="text-xs text-muted-foreground">
          Select a case on the map.
        </p>
      ) : (
        <>
          {detail ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{detail.admin0_iso}</Badge>
              <Badge variant="outline">{detail.classification}</Badge>
            </div>
          ) : null}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3.5" />
              Loading…
            </div>
          ) : (
            <ol className="space-y-2">
              {detail?.events.map((ev, i) => (
                <li key={`${ev.kind}-${ev.at}-${i}`} className="text-xs">
                  <p className="font-medium text-foreground">{ev.label}</p>
                  <p className="text-muted-foreground">{ev.at}</p>
                </li>
              ))}
              {detail && detail.events.length === 0 ? (
                <li className="text-xs text-muted-foreground">No dated events</li>
              ) : null}
            </ol>
          )}
        </>
      )}
    </PanelFrame>
  );
}
