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
import { curateTableFeatures } from "./curate-table-features";

export type PipelineRow = {
  stage: string;
  href: string;
  count: number | string;
  note: string;
};

const columns: Array<ColumnDef<typeof curateTableFeatures, PipelineRow>> = [
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <Link
        href={row.original.href}
        className="font-medium text-blue-700 hover:underline dark:text-blue-400"
      >
        {row.original.stage}
      </Link>
    ),
  },
  {
    accessorKey: "count",
    header: "Count",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number | string>()}</span>
    ),
  },
  {
    accessorKey: "note",
    header: "Notes",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<string>()}</span>
    ),
  },
];

export function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  const table = useTable({
    features: curateTableFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.stage,
  });

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
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
