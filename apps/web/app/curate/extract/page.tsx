import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

/**
 * Gated Extract stage. Production keeps EXTRACT_ENABLED=false; backend is stub only.
 */
export default async function CurateExtractPage() {
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Extract</h1>
          <p className="text-sm text-muted-foreground">
            Jev-style classify → extract → verify plug-in. Outputs always enter
            pending review — never auto-approve.
          </p>
        </div>
        <div className="flex gap-2">
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
            </Link>
            .
          </p>
          <p>
            Production must keep{" "}
            <code className="text-xs">EXTRACT_ENABLED=false</code>. Staging may
            evaluate with the gate open after the backend plug-in lands.
          </p>
          {!extractEnabled && (
            <p>
              Add claims manually in{" "}
              <Button variant="link" size="xs" className="h-auto p-0" asChild>
                <Link href="/curate/review">Review</Link>
              </Button>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
