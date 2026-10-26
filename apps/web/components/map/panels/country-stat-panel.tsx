"use client";

import { useEffect, useState } from "react";
import type { CountryStatRow } from "@/lib/data-types";
import {
  TRACKED_COUNTRIES,
  statsPanelId,
  type TrackedCountryIso,
} from "@/lib/tracked-countries";
import { Spinner } from "@/components/ui/spinner";
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

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function CountryStatPanel({ iso }: { iso: TrackedCountryIso }) {
  const country = TRACKED_COUNTRIES.find((c) => c.iso === iso);
  const [row, setRow] = useState<CountryStatRow | null>(null);
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
          if (!cancelled) setRow(null);
          return;
        }
        const data = (await res.json()) as CountryStatRow[];
        if (cancelled) return;
        const found = (Array.isArray(data) ? data : []).find(
          (r) => r.admin0_iso === iso,
        );
        setRow(found ?? null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [iso]);

  if (!country) return null;

  const stats = row ?? emptyRow(iso, country.name);

  return (
    <PanelFrame
      id={statsPanelId(iso)}
      title={country.shortName}
      accentColor={country.color}
      contentClassName="space-y-1.5 pt-2"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          Loading…
        </div>
      ) : (
        <>
          <StatLine label="Confirmed" value={stats.confirmed} />
          <StatLine label="Suspected" value={stats.suspected} />
          <StatLine label="Recovered" value={stats.recovered} />
          <StatLine label="Deceased" value={stats.deceased} />
        </>
      )}
    </PanelFrame>
  );
}
