"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";

type Measure = {
  id: string;
  title: string;
  summary?: string;
  applies_to_countries: string[];
  measure_type: string;
  as_of_date: string;
};

/** Local keyword RAG stand-in until Vectorize is wired in production Workers. */
export function MeasuresAsk({ measures }: { measures: Measure[] }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");

  const hits = useMemo(() => {
    if (!asked.trim()) return [];
    const terms = asked.toLowerCase().split(/\s+/).filter(Boolean);
    return measures
      .map((m) => {
        const blob = `${m.title} ${m.summary ?? ""} ${m.measure_type} ${m.applies_to_countries.join(" ")}`.toLowerCase();
        const score = terms.reduce((s, t) => s + (blob.includes(t) ? 1 : 0), 0);
        return { m, score };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [asked, measures]);

  return (
    <Card>
      <CardHeader className="text-sm font-semibold">Ask</CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="entry screening Kenya"
            className="min-w-[240px] flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <Button type="button" onClick={() => setAsked(q)}>
            Search
          </Button>
        </div>
        {asked && hits.length === 0 && (
          <div className="text-sm text-zinc-600">No matching measures</div>
        )}
        {hits.map(({ m }) => (
          <div key={m.id} className="rounded-md border border-zinc-200 p-3 text-sm">
            <div className="font-medium">{m.title}</div>
            <div className="mt-1 text-zinc-700">{m.summary}</div>
            <div className="mt-1 text-xs text-zinc-500">as-of {m.as_of_date}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
