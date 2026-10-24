import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { getConflictViews, getInboxCandidates } from "../../lib/data";
import { ConflictPair } from "../../components/conflicts/conflict-pair";
import { ResolveConflictActions } from "../../components/conflicts/resolve-conflict-actions";
import { InboxActions } from "../../components/curate/inbox-actions";

export default async function CuratePage() {
  const [inbox, conflicts] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
  ]);
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
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Publisher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inbox.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <a href={i.url} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
                      {i.title ?? i.url}
                    </a>
                  </TableCell>
                  <TableCell>{i.publisher ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.kind}</Badge>
                  </TableCell>
                  <TableCell>
                    <InboxActions url={i.url} />
                  </TableCell>
                </TableRow>
              ))}
              {inbox.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>No candidates</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">Extract</CardHeader>
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
