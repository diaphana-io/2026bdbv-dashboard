import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ClaimReviewForm } from "../../../components/curate/claim-review-form";

export default async function CurateReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const sp = await searchParams;
  const url = sp.url ?? "";

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Review</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject pending claims. Confidence is set here — Extract only
            suggests.
          </p>
        </div>
        <Badge variant="secondary">CF Access</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="text-sm font-semibold">Source</CardHeader>
          <CardContent className="text-sm break-all text-zinc-700 dark:text-zinc-300">
            {url || "No source URL — open a candidate from Inbox, or paste a URL below."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-semibold">Claim</CardHeader>
          <CardContent>
            <ClaimReviewForm sourceUrl={url} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">History</span>
          <Badge variant="outline">stub</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Claim lineage, version timeline, and{" "}
            <code className="text-xs">CurateAuditEvent</code> trail will render here
            (backed by <code className="text-xs">reviseClaim</code> /{" "}
            <code className="text-xs">rollbackClaim</code> /{" "}
            <code className="text-xs">appendAudit</code>).
          </p>
          <p>
            Append-only: approved heads are never overwritten; revisions and rollbacks
            create new pending versions. Full version browser is a follow-up.
          </p>
          <ul className="list-inside list-disc text-xs">
            <li>Approvals: 1 of 1 (policy) — multi-approver later</li>
            <li>reviewed_by / reviewed_at shown when a claim is loaded</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
