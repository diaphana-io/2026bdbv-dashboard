"use client";

import Link from "next/link";
import {
  flexRender,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConflictView } from "@/lib/data-types";
import { curateTableFeatures } from "./curate-table-features";

const columns: Array<ColumnDef<typeof curateTableFeatures, ConflictView>> = [
  {
    id: "subject",
    accessorFn: (row) => row.conflict.subject_ref,
    header: "Subject",
  },
  {
    id: "type",
    accessorFn: (row) => row.conflict.claim_type,
    header: "Type",
  },
  {
    id: "detected",
    accessorFn: (row) => row.conflict.detected_at.slice(0, 10),
    header: "Detected",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    id: "resolve",
    header: "",
    cell: () => (
      <div className="text-right">
        <Link
          href="/curate/conflicts"
          className="text-xs text-blue-700 hover:underline dark:text-blue-400"
        >
          Resolve
        </Link>
      </div>
    ),
  },
];

export function ConflictsPreviewTable({
  rows,
  limit = 5,
}: {
  rows: ConflictView[];
  limit?: number;
}) {
  const data = rows.slice(0, limit);
  const table = useTable({
    features: curateTableFeatures,
    columns,
    data,
    getRowId: (row) => row.conflict.id,
  });
  const modelRows = table.getRowModel().rows;
  const colCount = table.getAllColumns().length;

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {modelRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colCount} className="text-muted-foreground">
              No open conflicts
            </TableCell>
          </TableRow>
        ) : (
          modelRows.map((row) => (
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
