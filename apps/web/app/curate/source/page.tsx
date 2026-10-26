import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { CatalogClaimsTable } from "../../../components/curate/catalog-claims-table";
import { ClaimReviewForm } from "../../../components/curate/claim-review-form";
import { getSourceCatalogDetail } from "../../../lib/data";

/**
 * Claim-only source workspace (Catalog → Extract stub + claims + Approve).
 * Case work must not use this route.
 */
export default async function CurateSourceWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const sp = await searchParams;
  const url = sp.url?.trim() ?? "";
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  if (!url) {
    return (
      <main className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Claim source workspace</h1>
          <p className="text-sm text-muted-foreground">
            Open a Catalog source with{" "}
            <code className="text-xs">?url=</code> to run Claim Extract,
            review claims, and Approve or Reject.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/curate/catalog">Back to Catalog</Link>
        </Button>
      </main>
    );
  }

  const detail = await getSourceCatalogDetail(url);
  if (!detail) {
    return (
      <main className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Claim source workspace</h1>
          <p className="text-sm text-muted-foreground">
            Source not found for <code className="text-xs">{url}</code>. Adopt
            it from Inbox first, or pick a Catalog row.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/curate/catalog">Catalog</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/curate/inbox">Inbox</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { source, claims } = detail;
  const catalogHref = `/curate/catalog?source=${encodeURIComponent(source.normalized_url || source.url)}`;
  const reviewHref = `/curate/review?url=${encodeURIComponent(source.url)}`;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-2">
            <Button variant="ghost" size="xs" asChild>
              <Link href={catalogHref}>← Catalog</Link>
            </Button>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/curate/extract">Claim Extract</Link>
            </Button>
            <Button variant="ghost" size="xs" asChild>
              <Link href={reviewHref}>Claim Review</Link>
            </Button>
          </div>
          <h1 className="text-lg font-semibold">
            {source.title ?? source.url}
          </h1>
          <p className="break-all text-sm text-muted-foreground">{source.url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Claim track</Badge>
          <Badge variant="secondary">{source.curation_status}</Badge>
          {source.evidence_class && (
            <Badge variant="secondary">{source.evidence_class}</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Claim Extract</span>
          <div className="flex gap-2">
            <Badge variant={extractEnabled ? "warning" : "outline"}>
              Gate {extractEnabled ? "open" : "closed"}
            </Badge>
            <Badge variant="secondary">not_configured</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Stub only —{" "}
            <code className="text-xs">curate.extractClaims</code> returns{" "}
            <Badge variant="outline">not_configured</Badge> until a Jev (or
            other) adapter is wired. Production keeps{" "}
            <code className="text-xs">EXTRACT_ENABLED=false</code>.
          </p>
          <p>
            Enter or Approve claims below; outputs always stay pending until
            human Approve / Reject.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Claims</span>
          <div className="flex gap-2">
            <Badge variant="secondary">{claims.length} total</Badge>
            <Badge variant="outline">{source.approved_count} approved</Badge>
            {source.pending_count > 0 && (
              <Badge variant="warning">{source.pending_count} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <CatalogClaimsTable claims={claims} sourceUrl={source.url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">
          Claim Approve / Reject
        </CardHeader>
        <CardContent>
          <ClaimReviewForm sourceUrl={source.url} />
        </CardContent>
      </Card>
    </main>
  );
}
