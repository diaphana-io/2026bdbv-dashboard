import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { CatalogClaimsTable } from "../../../components/curate/catalog-claims-table";
import { CatalogSourcesTable } from "../../../components/curate/catalog-sources-table";
import {
  getCatalogSources,
  getSourceCatalogDetail,
} from "../../../lib/data";

/**
 * Catalog — post-Inbox sources with claims, lineage, and rollback.
 * Graph via lib/data (cache → Bolt timeout → JSON).
 */
export default async function CurateCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const sp = await searchParams;
  const sourceKey = sp.source?.trim() ?? "";

  if (sourceKey) {
    const detail = await getSourceCatalogDetail(sourceKey);
    if (!detail) {
      return (
        <main className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold">Catalog</h1>
            <p className="text-sm text-muted-foreground">
              Source not found for{" "}
              <code className="text-xs">{sourceKey}</code>.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/curate/catalog">Back to Catalog</Link>
          </Button>
        </main>
      );
    }

    const { source, claims } = detail;
    const audits = claims.flatMap((c) => c.audits).sort((a, b) =>
      b.at.localeCompare(a.at),
    );

    return (
      <main className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1">
              <Button variant="ghost" size="xs" asChild>
                <Link href="/curate/catalog">← Catalog</Link>
              </Button>
            </div>
            <h1 className="text-lg font-semibold">
              {source.title ?? source.url}
            </h1>
            <p className="break-all text-sm text-muted-foreground">
              {source.url}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{source.kind}</Badge>
            <Badge variant="secondary">{source.curation_status}</Badge>
            {source.evidence_class && (
              <Badge variant="secondary">{source.evidence_class}</Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="text-sm font-semibold">Timing</CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Latest review</div>
              <div>{source.latest_reviewed_at?.slice(0, 19) ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Published</div>
              <div>{source.published_at?.slice(0, 10) ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Discovered</div>
              <div>{source.discovered_at?.slice(0, 10) ?? "—"}</div>
            </div>
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

        {audits.length > 0 && (
          <Card>
            <CardHeader className="text-sm font-semibold">
              Recent audit
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {audits.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <Badge variant="outline">{a.action}</Badge>{" "}
                    <span className="text-muted-foreground">{a.actor}</span>
                    {a.reason && (
                      <span className="ml-2 text-xs">— {a.reason}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {a.at.slice(0, 19)}
                    {a.from_version != null && a.to_version != null
                      ? ` · v${a.from_version}→v${a.to_version}`
                      : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    );
  }

  const sources = await getCatalogSources();

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Ingested sources after Inbox — when reviewed, how extracted, and
            resulting claims. Rollback withdraws a claim lineage from the Map
            and re-queues it for Review.
          </p>
        </div>
        <Badge variant="secondary">{sources.length} sources</Badge>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Sources</CardHeader>
        <CardContent className="p-0">
          <CatalogSourcesTable rows={sources} />
        </CardContent>
      </Card>
    </main>
  );
}
