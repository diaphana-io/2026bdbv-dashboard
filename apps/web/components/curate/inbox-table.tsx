"use client";

import {
  flexRender,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InboxRow } from "@/lib/data-types";
import { DuplicateLevelBadge } from "./duplicate-level-badge";
import { InboxActions } from "./inbox-actions";

const inboxTableFeatures = tableFeatures({ rowSelectionFeature });

const baseColumns: Array<ColumnDef<typeof inboxTableFeatures, InboxRow>> = [
  {
    id: "title",
    accessorFn: (row) => row.title ?? row.url,
    header: "Title",
    cell: ({ row }) => {
      const i = row.original;
      return (
        <>
          <a
            href={i.url}
            className="text-blue-700 hover:underline dark:text-blue-400"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {i.title ?? i.url}
          </a>
          {i.discovered_at && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Discovered {i.discovered_at.slice(0, 10)}
            </div>
          )}
        </>
      );
    },
  },
  {
    accessorKey: "publisher",
    header: "Publisher",
    cell: ({ getValue }) => getValue<string | undefined>() ?? "—",
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
    accessorFn: (row) => row.evidence_class ?? "other",
    header: "Evidence",
    cell: ({ getValue }) => (
      <Badge variant="secondary">{getValue<string>()}</Badge>
    ),
  },
  {
    id: "duplicate",
    accessorFn: (row) => row.duplicate_level,
    header: "Duplicate",
    cell: ({ row }) => (
      <DuplicateLevelBadge level={row.original.duplicate_level} />
    ),
  },
];

const actionsColumn: ColumnDef<typeof inboxTableFeatures, InboxRow> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => (
    <InboxActions
      url={row.original.url}
      duplicateLevel={row.original.duplicate_level}
    />
  ),
};

function selectionFromId(id: string | null | undefined): RowSelectionState {
  return id ? { [id]: true } : {};
}

export function InboxTable({
  rows,
  limit,
  showActions = true,
  selectedId = null,
  onSelect,
}: {
  rows: InboxRow[];
  limit?: number;
  showActions?: boolean;
  selectedId?: string | null;
  onSelect?: (row: InboxRow | null) => void;
}) {
  const data = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const columns = showActions
    ? [...baseColumns, actionsColumn]
    : baseColumns;
  const selectable = typeof onSelect === "function";

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() =>
    selectionFromId(selectedId),
  );

  useEffect(() => {
    setRowSelection(selectionFromId(selectedId));
  }, [selectedId]);

  function handleSelectionChange(updater: Updater<RowSelectionState>) {
    const next =
      typeof updater === "function" ? updater(rowSelection) : updater;
    setRowSelection(next);
    if (!onSelect) return;
    const id = Object.keys(next).find((key) => next[key]);
    if (!id) {
      onSelect(null);
      return;
    }
    const row = data.find((r) => r.id === id) ?? null;
    onSelect(row);
  }

  const table = useTable({
    features: inboxTableFeatures,
    columns,
    data,
    getRowId: (row) => row.id,
    enableRowSelection: selectable,
    enableMultiRowSelection: false,
    state: { rowSelection },
    onRowSelectionChange: handleSelectionChange,
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
              No candidates
            </TableCell>
          </TableRow>
        ) : (
          modelRows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className={selectable ? "cursor-pointer" : undefined}
              onClick={
                selectable
                  ? () => {
                      row.toggleSelected(true);
                    }
                  : undefined
              }
            >
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
