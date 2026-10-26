import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";

/**
 * Case track home (shell). Neo4j case graph SoT — Claim Catalog is not used here.
 */
export default function CurateCasesPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Cases</h1>
          <p className="text-sm text-muted-foreground">
            Case track entry. Individual-case graph work is separate from Claim
            tabular curation.
          </p>
        </div>
        <Badge variant="outline">Case track · shell</Badge>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Placeholder</CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Case Extract → Review → Approve uses Case-only screens under{" "}
            <code className="text-xs">/curate/cases/*</code>. Do not reuse Claim
            forms, Catalog, or{" "}
            <code className="text-xs">/curate/source</code>.
          </p>
          <p>
            Case edit, API, and Approve are follow-up. See{" "}
            <Link
              href="https://github.com/diaphana-io/2026bdbv-dashboard/blob/main/docs/curate-ui.md"
              className="text-blue-700 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noreferrer"
            >
              curate-ui.md
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/curate/cases/extract">Case Extract</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/curate/cases/review">Case Review</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
