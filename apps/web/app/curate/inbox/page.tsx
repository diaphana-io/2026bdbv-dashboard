import { InboxWorkspace } from "../../../components/curate/inbox-workspace";
import { getInboxCandidates } from "../../../lib/data";

/**
 * Inbox candidates — graph via lib/data (cache → Bolt timeout → JSON).
 * Layout: submit on top; candidates table + detail/edit panel below.
 */
export default async function CurateInboxPage() {
  const inbox = await getInboxCandidates();

  return (
    <main className="flex flex-col gap-4">
      <InboxWorkspace initialRows={inbox} />
    </main>
  );
}
