import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getConflictViews, getInboxCandidates } from "../../lib/data";
import { ConflictPair } from "../../components/conflicts/conflict-pair";
import { ResolveConflictActions } from "../../components/conflicts/resolve-conflict-actions";

export default function CuratePage() {
  const inbox = getInboxCandidates();
  const conflicts = getConflictViews();
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Curate</h1>
        <div className="flex gap-2">
          <Badge variant="secondary">CF Access</Badge>
          <Badge variant={extractEnabled ? "warning" : "outline"}>
            Extract {extractEnabled ? "on" : "stub"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Inbox candidates</span>
          <Badge>{inbox.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Publisher</TH>
                <TH>Kind</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {inbox.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <a href={i.url} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
                      {i.title ?? i.url}
                    </a>
                  </TD>
                  <TD>{i.publisher ?? "—"}</TD>
                  <TD>
                    <Badge variant="outline">{i.kind}</Badge>
                  </TD>
                  <TD>
                    <div className="flex gap-2">
                      <Link
                        href={`/curate/review?url=${encodeURIComponent(i.url)}`}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Accept
                      </Link>
                      <span className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-400">
                        Dismiss
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
              {inbox.length === 0 && (
                <TR>
                  <TD colSpan={4}>No candidates</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Extract</span>
          <a
            className="text-xs text-blue-700 hover:underline"
            href="https://github.com/diaphana-io/2026bdbv-dashboard/issues"
            target="_blank"
            rel="noreferrer"
          >
            Spec issue
          </a>
        </CardHeader>
        <CardContent className="text-sm text-zinc-700">
          {extractEnabled
            ? "Extract backend enabled"
            : "Extract backend not configured — add claims manually in Review"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Open conflicts</span>
          <Badge variant="warning">{conflicts.length}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {conflicts.map((c) => (
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
          {conflicts.length === 0 && <div className="text-sm text-zinc-600">No open conflicts</div>}
        </CardContent>
      </Card>
    </main>
  );
}
