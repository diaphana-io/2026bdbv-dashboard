import Link from "next/link";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";

/**
 * Case Review placeholder — Claim Review (/curate/review) must not be reused.
 */
export default function CurateCaseReviewPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Case Review</h1>
          <p className="text-sm text-muted-foreground">
            Case-only Review / Approve shell. Claim Approve / Reject forms are
            not used here.
          </p>
        </div>
        <Badge variant="outline">Case track · shell</Badge>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Placeholder</CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Case Approve is follow-up. This page exists so Case ERA stays on
            dedicated routes under{" "}
            <code className="text-xs">/curate/cases</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/curate/cases">Back to Cases</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/curate/cases/extract">Case Extract</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
