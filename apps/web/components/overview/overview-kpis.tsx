import { KpiTile } from "./kpi-tile";

export type OverviewKpiValues = {
  confirmed: number;
  deaths: number;
  followup: number;
  temporal: number;
};

export function OverviewKpis({
  country,
  kpis,
}: {
  country?: string;
  kpis: OverviewKpiValues;
}) {
  const labelCountry = country ?? "NG+KE+UG";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile label="Confirmed" value={String(kpis.confirmed)} country={labelCountry} />
      <KpiTile label="Deaths" value={String(kpis.deaths)} country={labelCountry} />
      <KpiTile
        label="Contacts under follow-up"
        value={String(kpis.followup)}
        country={labelCountry}
      />
      <KpiTile
        label="Temporal suspects"
        value={String(kpis.temporal)}
        country={labelCountry}
      />
    </div>
  );
}
