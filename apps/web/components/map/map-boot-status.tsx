"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  /** Module / component currently being loaded, e.g. `maplibre-gl`. */
  loading?: string | null;
  error?: string | null;
};

export function MapBootStatus({ loading, error }: Props) {
  if (!loading && !error) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#e8eef2]/50 px-4">
      <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm">
        {error ? null : <Spinner className="size-5 text-zinc-500" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">
            {error ? "Map failed to load" : "Loading"}
          </p>
          {error ? (
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          ) : loading ? (
            <Badge variant="outline" className="mt-1 font-mono text-[11px]">
              {loading}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
