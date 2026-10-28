import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ClaimReviewForm } from "../../../components/curate/claim-review-form";
import { getSourceCatalogDetail } from "../../../lib/data";
import { curateHref } from "@/lib/curate-surface";

/**
 * Claim Review / Approve (Claim track only).
 * Case Review lives under /curate/cases/review — do not reuse this form.
 */
export default async function CurateClaimReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; claim?: string }>;
}) {
  const sp = await searchParams;
  const url = sp.url ?? "";
  const claimId = sp.claim ?? "";

  const detail = url ? await getSourceCatalogDetail(url) : null;
  const audits =
    detail?.claims
      .flatMap((c) =>
        c.audits.map((a) => ({
          ...a,
          claim_type: c.claim_type,
          subject_ref: c.subject_ref,
        })),
      )
      .sort((a, b) => b.at.localeCompare(a.at)) ?? [];
  const catalogHref = url
    ? `${curateHref("catalog")}?source=${encodeURIComponent(url)}`
    : curateHref("catalog");
  const sourceHref = url
    ? `${curateHref("source")}?url=${encodeURIComponent(url)}`
    : curateHref("source");

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Claim Review</h1>
          <p className="text-sm text-muted-foreground">
            Approve or Reject pending claims. Confidence is set here — Claim
            Extract only suggests. Case Review is a separate track.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Claim track</Badge>
          <Badge variant="secondary">CF Access</Badge>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">Source</span>
            {url && (
              <Button variant="outline" size="xs" asChild>
                <Link href={sourceHref}>Open workspace</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm break-all text-zinc-700 dark:text-zinc-300">
            <p>
              {url ||
                "No source URL — Adopt a candidate from Inbox, open Catalog, or paste a URL below."}
            </p>
            {claimId && (
              <p className="text-xs text-muted-foreground">
                Focus claim: <code>{claimId}</code>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-semibold">
            Claim Approve / Reject
          </CardHeader>
          <CardContent>
            <ClaimReviewForm sourceUrl={url} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">History</span>
          <div className="flex items-center gap-2">
            {audits.length > 0 ? (
              <Badge variant="secondary">{audits.length} events</Badge>
            ) : (
              <Badge variant="outline">empty</Badge>
            )}
            <Button variant="outline" size="xs" asChild>
              <Link href={catalogHref}>Open in Catalog</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audits.length === 0 ? (
            <p className="text-muted-foreground">
              No audit events for this source yet. Approve or Reject a claim, or
              open Catalog to browse lineages and roll back Map heads.
            </p>
          ) : (
            <ul className="space-y-2">
              {audits.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                >
                  <div>
                    <Badge variant="outline">{a.action}</Badge>{" "}
                    <span className="text-muted-foreground">
                      {a.claim_type} · {a.subject_ref}
                    </span>
                    {a.reason && (
                      <span className="ml-2 text-xs">— {a.reason}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {a.at.slice(0, 19)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
