import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { curateHref } from "@/lib/curate-surface";

/**
 * Claim Extract stage (Claim track only). Production keeps EXTRACT_ENABLED=false.
 * Case Extract lives under /curate/cases/extract — do not reuse this page.
 */
export default async function CurateClaimExtractPage() {
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Claim Extract</h1>
          <p className="text-sm text-muted-foreground">
            Raise table claim rows from Catalog sources. Outputs always enter
            Claim Review — never auto-approve. Case Extract is a separate
            track.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Claim track</Badge>
          <Badge variant={extractEnabled ? "warning" : "outline"}>
            Gate {extractEnabled ? "open" : "closed"}
          </Badge>
          <Badge variant="secondary">not_configured</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Backend status</CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <code className="text-xs">curate.classifySource</code> and{" "}
            <code className="text-xs">curate.extractClaims</code> return{" "}
            <Badge variant="outline">not_configured</Badge> until a Jev (or other)
            adapter is wired. See{" "}
            <Link
              href="https://github.com/diaphana-io/2026bdbv-dashboard/blob/main/docs/extract-issue.md"
              className="text-blue-700 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noreferrer"
            >
              extract-issue.md
            </Link>{" "}
            and{" "}
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
          <p>
            Production must keep{" "}
            <code className="text-xs">EXTRACT_ENABLED=false</code>. Open an
            adopted Catalog source to work claims in the source workspace.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={curateHref("catalog")}>Open Catalog</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={curateHref("review")}>Claim Review</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
