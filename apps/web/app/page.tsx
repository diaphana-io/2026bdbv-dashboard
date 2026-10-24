import { OverviewKpis } from "../components/overview/overview-kpis";
import { AsOfBadge } from "../components/overview/as-of-badge";

export default function Home() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Overview</h1>
        <AsOfBadge date="2026-10-23" />
      </div>
      <OverviewKpis />
    </main>
  );
}
