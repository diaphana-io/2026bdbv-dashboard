"use client";

import { useEffect, useState } from "react";
import type { CountryStatRow } from "@/lib/data-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { PanelFrame } from "./panel-frame";

export function CountryStatsPanel() {
  const [rows, setRows] = useState<CountryStatRow[]>([]);
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
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as CountryStatRow[];
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PanelFrame id="country-stats" title="Country statistics" className="w-[28rem]">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Country statistics not available yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Confirmed</TableHead>
              <TableHead className="text-right">Suspected</TableHead>
              <TableHead className="text-right">Recovered</TableHead>
              <TableHead className="text-right">Deceased</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.admin0_iso}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.confirmed}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.suspected}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.recovered}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.deceased}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelFrame>
  );
}
