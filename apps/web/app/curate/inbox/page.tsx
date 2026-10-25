import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { InboxTable } from "../../../components/curate/inbox-table";
import { getInboxCandidates } from "../../../lib/data";

/**
 * Inbox candidates — graph via lib/data (cache → Bolt timeout → JSON).
 */
export default async function CurateInboxPage() {
  const inbox = await getInboxCandidates();
  const dupFlagged = inbox.filter(
    (i) => i.duplicate_level && i.duplicate_level !== "none",
  );

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Discovered source candidates. Exact duplicates stay visible with a soft
            Accept — flags are informational, not auto-discard.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{inbox.length} candidates</Badge>
          <Badge variant="warning">{dupFlagged.length} flagged</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Candidates</CardHeader>
        <CardContent className="p-0">
          <InboxTable rows={inbox} />
        </CardContent>
      </Card>
    </main>
  );
}
