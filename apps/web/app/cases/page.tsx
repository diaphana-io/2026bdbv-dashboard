import { CountryFilter } from "../../components/overview/country-filter";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getCases } from "../../lib/data";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; confirmed?: string }>;
}) {
  const sp = await searchParams;
  const country = sp.country ?? "ALL";
  const confirmedOnly = sp.confirmed === "1";
  const rows = await getCases({
    country: country === "ALL" ? undefined : country,
    confirmedOnly,
    includeTemporalSuspects: !confirmedOnly,
  });

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Cases</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={confirmedOnly ? "/cases" : "/cases?confirmed=1"}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
          >
            {confirmedOnly ? "Cohort" : "Confirmed BDBV only"}
          </a>
          <CountryFilter active={country} basePath="/cases" />
        </div>
      </div>
      <Card>
        <CardHeader className="text-sm font-medium">{rows.length} rows</CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Country</TH>
                <TH>Class</TH>
                <TH>Onset</TH>
                <TH>Outcome</TH>
                <TH>Inclusion</TH>
                <TH>Confidence</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-xs">{r.visual_id}</TD>
                  <TD>{r.admin0_iso}</TD>
                  <TD>
                    <Badge variant="secondary">{r.classification}</Badge>
                  </TD>
                  <TD>{r.date_of_onset ?? "—"}</TD>
                  <TD>{r.outcome ?? "—"}</TD>
                  <TD className="text-xs">{r.inclusion_reason}</TD>
                  <TD className="text-xs">{r.confidence}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
