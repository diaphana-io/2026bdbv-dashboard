import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ConflictPair } from "@/components/curate/conflicts/conflict-pair";
import { ResolveConflictActions } from "@/components/curate/conflicts/resolve-conflict-actions";
import { getConflictViews } from "../../../lib/data";

/**
 * Open claim conflicts — both sides stay visible until human resolve.
 */
export default async function CurateConflictsPage() {
  const conflicts = await getConflictViews();
  const open = conflicts.filter((c) => c.conflict.status === "open");

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Conflicts</h1>
          <p className="text-sm text-muted-foreground">
            Unresolved claim conflicts stay visible until a human resolves them.
          </p>
        </div>
        <Badge variant="warning">{open.length} open</Badge>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Open conflicts</CardHeader>
        <CardContent className="flex flex-col gap-4">
          {open.map((c) => (
            <div key={c.conflict.id} className="flex flex-col gap-2">
              <ConflictPair
                claimA={{
                  id: c.claim_a.id,
                  source_label: c.source_a?.publisher ?? "A",
                  as_of_date: c.claim_a.as_of_date,
                  summary: JSON.stringify(c.claim_a.object_value),
                  confidence: c.claim_a.confidence,
                }}
                claimB={{
                  id: c.claim_b.id,
                  source_label: c.source_b?.publisher ?? "B",
                  as_of_date: c.claim_b.as_of_date,
                  summary: JSON.stringify(c.claim_b.object_value),
                  confidence: c.claim_b.confidence,
                }}
              />
              <ResolveConflictActions conflictId={c.conflict.id} />
            </div>
          ))}
          {open.length === 0 && (
            <div className="text-sm text-muted-foreground">No open conflicts</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
