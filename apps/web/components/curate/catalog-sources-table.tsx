"use client";

import Link from "next/link";
import {
  flexRender,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogSourceRow } from "@/lib/data-types";
import { curateTableFeatures } from "./curate-table-features";

const columns: Array<ColumnDef<typeof curateTableFeatures, CatalogSourceRow>> = [
  {
    id: "source",
    accessorFn: (row) => row.title ?? row.url,
    header: "Source",
    cell: ({ row }) => {
      const s = row.original;
      return (
        <div className="min-w-0">
          <Link
            href={`/curate/catalog?source=${encodeURIComponent(s.normalized_url || s.id)}`}
            className="font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            {s.title ?? s.url}
          </Link>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {s.url}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "kind",
    header: "Kind",
    cell: ({ getValue }) => (
      <Badge variant="outline">{getValue<string>()}</Badge>
    ),
  },
  {
    id: "evidence",
    accessorFn: (row) => row.evidence_class ?? "—",
    header: "Evidence",
    cell: ({ getValue }) => {
      const v = getValue<string>();
      return v === "—" ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <Badge variant="secondary">{v}</Badge>
      );
    },
  },
  {
    id: "when",
    accessorFn: (row) =>
      row.latest_reviewed_at ?? row.published_at ?? row.discovered_at ?? "",
    header: "When",
    cell: ({ row }) => {
      const s = row.original;
      const reviewed = s.latest_reviewed_at?.slice(0, 10);
      const published = s.published_at?.slice(0, 10);
      const discovered = s.discovered_at?.slice(0, 10);
      return (
        <div className="text-xs text-muted-foreground">
          {reviewed && <div>Reviewed {reviewed}</div>}
          {published && <div>Published {published}</div>}
          {!reviewed && !published && discovered && (
            <div>Discovered {discovered}</div>
          )}
          {!reviewed && !published && !discovered && "—"}
        </div>
      );
    },
  },
  {
    id: "claims",
    accessorFn: (row) => row.claim_count,
    header: "Claims",
    cell: ({ row }) => {
      const s = row.original;
      return (
        <div className="text-xs tabular-nums">
          <span>{s.claim_count}</span>
          <span className="text-muted-foreground">
            {" "}
            ({s.approved_count} approved
            {s.pending_count > 0 ? `, ${s.pending_count} pending` : ""})
          </span>
        </div>
      );
    },
  },
  {
    id: "extractor",
    accessorFn: (row) => row.extractors.join(","),
    header: "Extractor",
    cell: ({ row }) => {
      const mix = row.original.extractors;
      if (mix.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {mix.map((e) => (
            <Badge key={e} variant="outline">
              {e}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "curation_status",
    header: "Status",
    cell: ({ getValue }) => (
      <Badge variant="secondary">{getValue<string>()}</Badge>
    ),
  },
];

export function CatalogSourcesTable({ rows }: { rows: CatalogSourceRow[] }) {
  const table = useTable({
    features: curateTableFeatures,
    data: rows,
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
              No ingested sources yet.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
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
