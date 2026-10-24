import { AsOfBadge } from "../components/overview/as-of-badge";
import { CountryFilter } from "../components/overview/country-filter";
import { OverviewKpis } from "../components/overview/overview-kpis";
import { ConflictPair } from "../components/conflicts/conflict-pair";
import { getConflictViews, overviewKpis } from "../lib/data";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader } from "../components/ui/card";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const sp = await searchParams;
  const country = sp.country ?? "ALL";
  const k = overviewKpis(country === "ALL" ? undefined : country);
  const conflicts = getConflictViews();

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Overview</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">staging</Badge>
          <AsOfBadge date={k.asOf} />
          <CountryFilter active={country} basePath="/" />
        </div>
      </div>
      <OverviewKpis country={country === "ALL" ? undefined : country} />
      {conflicts.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Open conflicts</span>
            <Badge variant="warning">{conflicts.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {conflicts.map((c) => (
              <ConflictPair
                key={c.conflict.id}
                claimA={{
                  id: c.claim_a.id,
                  source_label: c.source_a?.publisher ?? c.source_a?.title ?? "Source A",
                  as_of_date: c.claim_a.as_of_date,
                  summary: `KE confirmed=${String((c.claim_a.object_value as { confirmed?: number }).confirmed ?? "?")}`,
                  confidence: c.claim_a.confidence,
                }}
                claimB={{
                  id: c.claim_b.id,
                  source_label: c.source_b?.publisher ?? c.source_b?.title ?? "Source B",
                  as_of_date: c.claim_b.as_of_date,
                  summary: `KE confirmed=${String((c.claim_b.object_value as { confirmed?: number }).confirmed ?? "?")}`,
                  confidence: c.claim_b.confidence,
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
