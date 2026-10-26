"use client";

import Link from "next/link";
import {
  flexRender,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogClaimRow } from "@/lib/data-types";
import { curateTableFeatures } from "./curate-table-features";
import { RollbackClaimDialog } from "./rollback-claim-dialog";

function objectPreview(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

export function CatalogClaimsTable({
  claims,
  sourceUrl,
}: {
  claims: CatalogClaimRow[];
  sourceUrl: string;
}) {
  const byLineage = new Map<string, CatalogClaimRow[]>();
  for (const c of claims) {
    const list = byLineage.get(c.lineage_id) ?? [];
    list.push(c);
    byLineage.set(c.lineage_id, list);
  }

  const columns: Array<
    ColumnDef<typeof curateTableFeatures, CatalogClaimRow>
  > = [
    {
      accessorKey: "claim_type",
      header: "Type",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-sm">
            <div className="font-medium">{c.claim_type}</div>
            <div className="text-[11px] text-muted-foreground">
              v{c.version}
              {c.is_head ? " · head" : ""}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject_ref",
      header: "Zone",
      cell: ({ getValue }) => (
        <code className="text-xs">{getValue<string>()}</code>
      ),
    },
    {
      accessorKey: "as_of_date",
      header: "as_of",
      cell: ({ getValue }) => (
        <span className="text-xs tabular-nums">{getValue<string>()}</span>
      ),
    },
    {
      id: "object",
      accessorFn: (row) => objectPreview(row.object_value),
      header: "Object",
      cell: ({ getValue }) => (
        <code className="max-w-[14rem] truncate text-[11px]">
          {getValue<string>()}
        </code>
      ),
    },
    {
      accessorKey: "review_status",
      header: "Status",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-xs">
            <Badge
              variant={
                c.review_status === "approved"
                  ? "secondary"
                  : c.review_status === "pending_review"
                    ? "warning"
                    : "outline"
              }
            >
              {c.review_status}
            </Badge>
            {c.reviewed_at && (
              <div className="mt-0.5 text-muted-foreground">
                {c.reviewed_at.slice(0, 10)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const c = row.original;
        const lineage = byLineage.get(c.lineage_id) ?? [c];
        const isApprovedHead =
          c.review_status === "approved" && c.is_head !== false;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="xs" asChild>
              <Link
                href={`/curate/review?url=${encodeURIComponent(sourceUrl)}&claim=${encodeURIComponent(c.id)}`}
              >
                Open Claim Review
              </Link>
            </Button>
            {isApprovedHead && (
              <RollbackClaimDialog head={c} lineageVersions={lineage} />
            )}
          </div>
        );
      },
    },
  ];

  const table = useTable({
    features: curateTableFeatures,
    data: claims,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => (
              <TableHead key={h.id}>
                {h.isPlaceholder
                  ? null
                  : flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              No claims linked to this source.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
