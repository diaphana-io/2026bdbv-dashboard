"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CountryStatRow } from "@/lib/data-types";
import {
  TRACKED_COUNTRIES,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useMapUi } from "../map-ui-context";
import { PanelFrame } from "./panel-frame";

function emptyRow(iso: TrackedCountryIso, name: string): CountryStatRow {
  return {
    admin0_iso: iso,
    name,
    confirmed: 0,
    suspected: 0,
    recovered: 0,
    deceased: 0,
    asOf: "",
  };
}

export function CountryStatsPanel() {
  const { selectedCountryIso } = useMapUi();
  const [byIso, setByIso] = useState<
    Partial<Record<TrackedCountryIso, CountryStatRow>>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_BASE_PATH ?? ""}/api/map/country-stats`,
        );
        if (!res.ok) {
          if (!cancelled) setByIso({});
          return;
        }
        const data = (await res.json()) as CountryStatRow[];
        if (cancelled) return;
        const next: Partial<Record<TrackedCountryIso, CountryStatRow>> = {};
        for (const row of Array.isArray(data) ? data : []) {
          const iso = row.admin0_iso as TrackedCountryIso;
          if (TRACKED_COUNTRIES.some((c) => c.iso === iso)) {
            next[iso] = row;
          }
        }
        setByIso(next);
      } catch {
        if (!cancelled) setByIso({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const countries = selectedCountryIso
    ? TRACKED_COUNTRIES.filter((c) => c.iso === selectedCountryIso)
    : TRACKED_COUNTRIES;

  const title = selectedCountryIso
    ? (TRACKED_COUNTRIES.find((c) => c.iso === selectedCountryIso)?.shortName ??
      "Country statistics")
    : "Country statistics";

  return (
    <PanelFrame id="country-stats" title={title} contentClassName="space-y-3 pt-2">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          Loading…
        </div>
      ) : (
        countries.map((country) => {
          const row = byIso[country.iso] ?? emptyRow(country.iso, country.name);
          const selected = selectedCountryIso === country.iso;
          return (
            <div
              key={country.iso}
              className={cn(
                "overflow-hidden rounded-md border border-l-4",
                selected && "bg-muted/40",
              )}
              style={
                {
                  borderLeftColor: country.color,
                } as CSSProperties
              }
            >
              <div
                className="flex items-center gap-2 border-b px-2.5 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${country.color} 18%, transparent)`,
                }}
              >
                <span
                  className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: country.color }}
                  aria-hidden
                />
                {country.shortName}
              </div>
              <div className="space-y-1 px-2.5 py-2 text-xs tabular-nums">
                <StatLine label="Confirmed" value={row.confirmed} />
                <StatLine label="Suspected" value={row.suspected} />
                <StatLine label="Recovered" value={row.recovered} />
                <StatLine label="Deceased" value={row.deceased} />
              </div>
            </div>
          );
        })
      )}
    </PanelFrame>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
