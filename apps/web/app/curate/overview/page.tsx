import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ConflictsPreviewTable } from "../../../components/curate/conflicts-preview-table";
import { InboxTable } from "../../../components/curate/inbox-table";
import { PipelineTable } from "../../../components/curate/pipeline-table";
import { curateHref } from "@/lib/curate-surface";
import {
  getCatalogSources,
  getClaims,
  getConflictViews,
  getInboxCandidates,
} from "../../../lib/data";

/**
 * Overview command center. Graph reads via lib/data (cache → Bolt timeout → JSON).
 * Do not call Neo4j directly — hung Aura must not block first HTML (MATT-314).
 */
export default async function CurateOverviewPage() {
  const [inbox, conflicts, claims, catalog] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
    getClaims(),
    getCatalogSources(),
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
      href: curateHref("inbox"),
      count: inbox.length,
      note: `${dupFlagged.length} with duplicate flag · Adopt → Catalog`,
    },
    {
      stage: "Catalog",
      href: curateHref("catalog"),
      count: catalog.length,
      note: "Post-Adopt Claim home",
    },
    {
      stage: "Claim Extract",
      href: curateHref("extract"),
      count: extractEnabled ? "—" : 0,
      note: extractEnabled ? "Gate open (staging)" : "Stub / not configured",
    },
    {
      stage: "Claim Review",
      href: curateHref("review"),
      count: pendingReview.length,
      note: "Approve / Reject claims only",
    },
    {
      stage: "Conflicts",
      href: curateHref("conflicts"),
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
            Claim-track command center — Adopt → Catalog → Claim Extract /
            Review. Case work uses a separate sidebar section.
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
          <PipelineTable rows={pipelineRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Recent inbox</span>
          <Link
            href={curateHref("inbox")}
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
          <ConflictsPreviewTable rows={openConflicts} />
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
              href={curateHref("extract")}
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
