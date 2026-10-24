import { CountryFilter } from "../../components/overview/country-filter";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { getCases } from "../../lib/data";
import { CaseMap } from "../../components/map/case-map";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const sp = await searchParams;
  const country = sp.country ?? "ALL";
  const rows = (
    await getCases({
      country: country === "ALL" ? undefined : country,
      includeTemporalSuspects: true,
    })
  ).filter((c) => typeof c.lat === "number" && typeof c.lon === "number");

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Map</h1>
        <CountryFilter active={country} basePath="/map" />
      </div>
      <Card>
        <CardHeader className="text-sm font-medium">{rows.length} geocoded cases</CardHeader>
        <CardContent>
          <CaseMap
            points={rows.map((r) => ({
              id: r.visual_id,
              lat: r.lat as number,
              lon: r.lon as number,
              classification: r.classification,
              country: r.admin0_iso,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
