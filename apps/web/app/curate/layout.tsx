import { CurateShell } from "@/components/layout/curate-shell";
import { getCurateDataSourcePreference } from "@/lib/curate-data-source.server";
import { getConflictViews, getInboxCandidates } from "@/lib/data";
import { isNeo4jConfigured } from "@/lib/neo4j";

export default async function CurateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [inbox, conflicts, dataSource] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
    getCurateDataSourcePreference(),
  ]);

  return (
    <CurateShell
      inboxCount={inbox.length}
      conflictCount={conflicts.length}
      dataSource={dataSource}
      neo4jConfigured={isNeo4jConfigured()}
    >
      <div className="mx-auto max-w-7xl px-4 py-4">{children}</div>
    </CurateShell>
  );
}
