"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { InboxRow } from "@/lib/data-types";
import { InboxDetailPanel } from "./inbox-detail-panel";
import { InboxTable } from "./inbox-table";
import { SubmitSourceForm } from "./submit-source-form";

export function InboxWorkspace({ initialRows }: { initialRows: InboxRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRows[0]?.id ?? null,
  );

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const dupFlagged = rows.filter(
    (i) => i.duplicate_level && i.duplicate_level !== "none",
  );

  function onSubmitted(row: InboxRow) {
    setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
    setSelectedId(row.id);
  }

  function onUpdated(row: InboxRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
  }

  function onDismissed(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function onAdopted(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Submit or review source candidates. Adopt moves a source into
            Catalog for Claim Extract — flags are informational, not
            auto-discard.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{rows.length} candidates</Badge>
          <Badge variant="warning">{dupFlagged.length} flagged</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Submit source</CardHeader>
        <CardContent>
          <SubmitSourceForm onSubmitted={onSubmitted} />
        </CardContent>
      </Card>

      <div className="grid min-h-[28rem] gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="text-sm font-semibold">
            Candidate resources
          </CardHeader>
          <CardContent className="p-0">
            <InboxTable
              rows={rows}
              showActions={false}
              selectedId={selectedId}
              onSelect={(row) => setSelectedId(row?.id ?? null)}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="text-sm font-semibold">
            Source detail
          </CardHeader>
          <CardContent className="p-0">
            <InboxDetailPanel
              row={selected}
              onUpdated={onUpdated}
              onDismissed={onDismissed}
              onAdopted={onAdopted}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
