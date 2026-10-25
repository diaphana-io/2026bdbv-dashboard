import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { InboxTable } from "../../components/curate/inbox-table";
import { getClaims, getConflictViews, getInboxCandidates } from "../../lib/data";

/**
 * Overview command center. Graph reads via lib/data (cache → Bolt timeout → JSON).
 * Do not call Neo4j directly — hung Aura must not block first HTML (MATT-314).
 */
export default async function CurateOverviewPage() {
  const [inbox, conflicts, claims] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
    getClaims(),
  ]);
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";
  const pendingReview = claims.filter((c) => c.review_status === "pending_review");
  const dupFlagged = inbox.filter(
    (i) => i.duplicate_level && i.duplicate_level !== "none",
  );
  const openConflicts = conflicts.filter((c) => c.conflict.status === "open");

  const pipelineRows = [
    {
      stage: "Inbox",
      href: "/curate/inbox",
      count: inbox.length,
      note: `${dupFlagged.length} with duplicate flag`,
    },
    {
      stage: "Extract",
      href: "/curate/extract",
      count: extractEnabled ? "—" : 0,
      note: extractEnabled ? "Gate open (staging)" : "Stub / not configured",
    },
    {
      stage: "Review",
      href: "/curate/review",
      count: pendingReview.length,
      note: "Approvals: 1 of 1 (policy)",
    },
    {
      stage: "Conflicts",
      href: "/curate/conflicts",
      count: openConflicts.length,
      note: "Both claims visible until resolve",
    },
  ];

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline command center — work each stage in order.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">CF Access</Badge>
          <Badge variant={extractEnabled ? "warning" : "outline"}>
            Extract {extractEnabled ? "on" : "stub"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Pipeline counts</CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineRows.map((row) => (
                <TableRow key={row.stage}>
                  <TableCell>
                    <Link
                      href={row.href}
                      className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      {row.stage}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-muted-foreground">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Recent inbox</span>
          <Link
            href="/curate/inbox"
            className="text-xs text-blue-700 hover:underline dark:text-blue-400"
          >
            Open Inbox
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <InboxTable rows={inbox} limit={5} showActions={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Open conflicts</span>
          <Badge variant="warning">{openConflicts.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {openConflicts.slice(0, 5).map((c) => (
                <TableRow key={c.conflict.id}>
                  <TableCell>{c.conflict.subject_ref}</TableCell>
                  <TableCell>{c.conflict.claim_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.conflict.detected_at.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href="/curate/conflicts"
                      className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Resolve
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {openConflicts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No open conflicts
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="text-sm font-semibold">Last discovery run</CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Not configured — discovery cron / D1 job table is a follow-up. Seed inbox
            JSON stands in for R2 read-model until then.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-semibold">Extract gate</CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <code className="text-xs">EXTRACT_ENABLED</code>={" "}
              <Badge variant={extractEnabled ? "warning" : "outline"}>
                {extractEnabled ? "true" : "false"}
              </Badge>
            </p>
            <p>
              Backend: <Badge variant="outline">not_configured</Badge> (Jev stub)
            </p>
            <Link
              href="/curate/extract"
              className="inline-block text-xs text-blue-700 hover:underline dark:text-blue-400"
            >
              Open Extract stage
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
