import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { getCases, getSources } from "../../lib/data";

export default async function TimelinePage() {
  const [cases, sources] = await Promise.all([getCases(), getSources()]);
  const events = [
    ...cases.map((c) => ({
      date: c.date_of_reporting ?? c.date_of_onset ?? "",
      label: `${c.visual_id} · ${c.classification}`,
      kind: "case" as const,
    })),
    ...sources.map((s) => ({
      date: (s.published_at ?? "").slice(0, 10),
      label: s.title ?? s.url,
      kind: s.kind.startsWith("official") ? ("official" as const) : ("news" as const),
    })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Timeline</h1>
      <Card>
        <CardHeader className="text-sm font-medium">{events.length} events</CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.map((e, i) => (
            <div
              key={`${e.date}-${i}`}
              className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2 text-sm last:border-0"
            >
              <span className="w-28 font-mono text-xs text-zinc-600">{e.date}</span>
              <Badge variant={e.kind === "official" ? "default" : "secondary"}>{e.kind}</Badge>
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
