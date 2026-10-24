import { KpiTile } from "./kpi-tile";

export function OverviewKpis() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile label="Confirmed" value="—" country="NG+KE+UG" />
      <KpiTile label="Deaths" value="—" country="NG+KE+UG" />
      <KpiTile label="Contacts under follow-up" value="—" country="NG+KE+UG" />
      <KpiTile label="Temporal suspects" value="—" country="NG+KE+UG" />
    </div>
  );
}
