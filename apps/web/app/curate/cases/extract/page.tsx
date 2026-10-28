import Link from "next/link";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { curateHref } from "@/lib/curate-surface";

/**
 * Case Extract placeholder — Claim Extract (/curate/extract) must not be reused.
 */
export default function CurateCaseExtractPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Case Extract</h1>
          <p className="text-sm text-muted-foreground">
            Case-only Extract screen. Raises case-graph atoms from Neo4j — not
            D1 claim table rows.
          </p>
        </div>
        <Badge variant="outline">Case track · shell</Badge>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Placeholder</CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This route does not share Claim Extract UI or forms. Implementation
            is follow-up (out of scope for this Curate UI slice).
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={curateHref("cases")}>Back to Cases</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
