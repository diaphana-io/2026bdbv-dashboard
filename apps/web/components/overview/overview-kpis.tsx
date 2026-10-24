import { overviewKpis } from "../../lib/data";
import { KpiTile } from "./kpi-tile";

export async function OverviewKpis({ country }: { country?: string }) {
  const k = await overviewKpis(country);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile label="Confirmed" value={String(k.confirmed)} country={country ?? "NG+KE+UG"} />
      <KpiTile label="Deaths" value={String(k.deaths)} country={country ?? "NG+KE+UG"} />
      <KpiTile
        label="Contacts under follow-up"
        value={String(k.followup)}
        country={country ?? "NG+KE+UG"}
      />
      <KpiTile
        label="Temporal suspects"
        value={String(k.temporal)}
        country={country ?? "NG+KE+UG"}
      />
    </div>
  );
}
