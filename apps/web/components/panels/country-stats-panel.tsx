"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CountryStatRow } from "@/lib/data-types";
import {
  TRACKED_COUNTRIES,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useMapUi } from "../map/map-ui-context";

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
  const { countryStatsVisible } = useMapUi();
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

  const visible = TRACKED_COUNTRIES.filter((c) => countryStatsVisible[c.iso]);
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-12 sm:px-14">
      <div className="pointer-events-auto flex w-full max-w-5xl flex-wrap justify-center gap-2">
        {visible.map((country) => {
          const row = byIso[country.iso] ?? emptyRow(country.iso, country.name);
          return (
            <Card
              key={country.iso}
              size="sm"
              className="min-w-[9.5rem] flex-1 overflow-hidden border-l-4 bg-card/95 shadow-md backdrop-blur"
              style={
                {
                  borderLeftColor: country.color,
                } as CSSProperties
              }
            >
              <CardHeader
                className="border-b py-2"
                style={{
                  backgroundColor: `color-mix(in oklab, ${country.color} 18%, transparent)`,
                }}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: country.color }}
                    aria-hidden
                  />
                  {country.shortName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 py-2 text-xs tabular-nums">
                {loading ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Spinner className="size-3" />
                    Loading…
                  </div>
                ) : (
                  <>
                    <StatLine label="Confirmed" value={row.confirmed} />
                    <StatLine label="Suspected" value={row.suspected} />
                    <StatLine label="Recovered" value={row.recovered} />
                    <StatLine label="Deceased" value={row.deceased} />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
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
