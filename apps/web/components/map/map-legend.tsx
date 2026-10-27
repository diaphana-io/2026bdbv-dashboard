"use client";

import { cn } from "@/lib/utils";
import { useMapUi } from "./map-ui-context";
import { STATS_DOT_COLORS } from "./stats-dot-scatter";

const CLAIMS_ROWS = [
  { status: "confirmed" as const, label: "Confirmed" },
  { status: "deceased" as const, label: "Deceased" },
];

/** Match case-layer light-mode colors (Papers land). */
const CASE_ROWS = [
  { color: "#18181b", label: "Confirmed case" },
  { color: "#d97706", label: "Suspected case" },
  { color: "#71717a", label: "Other case" },
];

/**
 * Top-right map inset legend for Case Stats dots and Case Tracking points.
 */
export function MapLegend({ className }: { className?: string }) {
  const { layers, enabledStatsIsos } = useMapUi();
  const showClaims = enabledStatsIsos.length > 0;
  const showCases = layers.cases;
  if (!showClaims && !showCases) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-30 max-w-[14rem]",
        className,
      )}
    >
      <div className="pointer-events-auto rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
        {showClaims ? (
          <section className={showCases ? "mb-2 border-b border-border/70 pb-2" : undefined}>
            <p className="mb-1.5 font-medium text-foreground">Case stats</p>
            <ul className="space-y-1">
              {CLAIMS_ROWS.map((row) => (
                <li key={row.status} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: STATS_DOT_COLORS[row.status] }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{row.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {showCases ? (
          <section>
            <p className="mb-1.5 font-medium text-foreground">Cases</p>
            <ul className="space-y-1">
              {CASE_ROWS.map((row) => (
                <li key={row.label} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{row.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
