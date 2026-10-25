"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StatusState = "ok" | "stub" | "degraded" | "not_configured" | string;

function stateVariant(
  state: StatusState,
): "default" | "secondary" | "outline" | "warning" | "destructive" {
  switch (state) {
    case "ok":
      return "default";
    case "stub":
      return "secondary";
    case "degraded":
      return "destructive";
    case "not_configured":
      return "outline";
    default:
      return "outline";
  }
}

function StateBadge({ state }: { state: StatusState }) {
  return <Badge variant={stateVariant(state)}>{state}</Badge>;
}

export type StageRow = {
  id: string;
  label: string;
  order?: number;
  kind?: string;
  state: StatusState;
  count?: number | null;
  note?: string | null;
  href?: string | null;
};

export type LlmRow = {
  id: string;
  adapter_key?: string;
  label: string;
  state: StatusState;
  calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  provider?: string | null;
};

export type InfraRow = {
  id: string;
  label: string;
  state: StatusState;
  configured?: boolean;
  ok?: boolean;
  error?: string | null;
  node_count?: number | null;
  query_count?: number | null;
  cron_configured?: boolean;
};

/** Generic stage list — no per-id React branches. */
export function StagesStatusTable({ rows }: { rows: StageRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Count</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              {row.href ? (
                <Link
                  href={row.href}
                  className="text-blue-700 hover:underline dark:text-blue-400"
                >
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
            </TableCell>
            <TableCell>
              <StateBadge state={row.state} />
            </TableCell>
            <TableCell className="tabular-nums">
              {row.count == null ? "—" : row.count}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.note ?? ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Generic LLM adapter usage rows from engine `llm[]`. */
export function LlmStatusTable({ rows }: { rows: LlmRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Adapter</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Calls</TableHead>
          <TableHead>In tokens</TableHead>
          <TableHead>Out tokens</TableHead>
          <TableHead>Provider</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell>
              <StateBadge state={row.state} />
            </TableCell>
            <TableCell className="tabular-nums">{row.calls ?? 0}</TableCell>
            <TableCell className="tabular-nums">{row.input_tokens ?? 0}</TableCell>
            <TableCell className="tabular-nums">{row.output_tokens ?? 0}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.provider ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Generic infra probe rows from engine `infra[]`. */
export function InfraStatusTable({ rows }: { rows: InfraRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const parts: string[] = [];
          if (typeof row.node_count === "number") {
            parts.push(`${row.node_count} nodes`);
          }
          if (typeof row.query_count === "number") {
            parts.push(`${row.query_count} queries`);
          }
          if (row.cron_configured) parts.push("cron set");
          if (row.error) parts.push(row.error);
          return (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>
                <StateBadge state={row.state} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {parts.length ? parts.join(" · ") : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
