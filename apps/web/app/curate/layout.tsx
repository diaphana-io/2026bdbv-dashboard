import { CurateShell } from "@/components/layout/curate-shell";
import { getConflictViews, getInboxCandidates } from "@/lib/data";

export default async function CurateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [inbox, conflicts] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
  ]);

  return (
    <CurateShell inboxCount={inbox.length} conflictCount={conflicts.length}>
      <div className="mx-auto max-w-7xl px-4 py-4">{children}</div>
    </CurateShell>
  );
}
