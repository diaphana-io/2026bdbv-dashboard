"use client";

import type { CaseDetail } from "../../lib/data-types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  detail: CaseDetail | null;
  loading?: boolean;
  onClose: () => void;
};

export function CaseDrawer({ detail, loading, onClose }: Props) {
  if (!detail && !loading) return null;

  return (
    <aside className="pointer-events-auto absolute right-3 top-3 z-10 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-3 py-2">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {detail?.visual_id ?? "…"}
          </p>
          {detail ? (
            <p className="text-xs text-zinc-600">
              {detail.admin0_iso} · {detail.classification}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Spinner className="size-3.5" />
            Loading…
          </div>
        ) : (
          <ol className="space-y-2">
            {detail?.events.map((ev, i) => (
              <li key={`${ev.kind}-${ev.at}-${i}`} className="text-xs">
                <p className="font-medium text-zinc-900">{ev.label}</p>
                <p className="text-zinc-500">{ev.at}</p>
              </li>
            ))}
            {detail && detail.events.length === 0 ? (
              <li className="text-xs text-zinc-500">No dated events</li>
            ) : null}
          </ol>
        )}
      </div>
    </aside>
  );
}
