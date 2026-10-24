import { CountryFilter } from "../../components/overview/country-filter";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { getMeasures } from "../../lib/data";
import { MeasuresAsk } from "../../components/measures/measures-ask";

export default async function MeasuresPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const sp = await searchParams;
  const country = sp.country ?? "ALL";
  const rows = await getMeasures(country === "ALL" ? undefined : country);

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Measures</h1>
        <CountryFilter active={country} basePath="/measures" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{m.title}</span>
              <Badge variant={m.status === "active" ? "warning" : "secondary"}>{m.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{m.measure_type}</Badge>
                <Badge variant="secondary">{m.applies_to_countries.join(",")}</Badge>
                {m.poe && <Badge variant="outline">{m.poe}</Badge>}
              </div>
              <p className="text-zinc-700">{m.summary}</p>
              <div className="text-xs text-zinc-500">
                as-of {m.as_of_date} · {m.confidence}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <MeasuresAsk measures={rows} />
    </main>
  );
}
