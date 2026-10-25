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

export function InboxTable({
  rows,
  limit,
  showActions = true,
}: {
  rows: InboxRow[];
  limit?: number;
  showActions?: boolean;
}) {
  const list = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const cols = showActions ? 6 : 5;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Publisher</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Evidence</TableHead>
          <TableHead>Duplicate</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((i) => (
          <TableRow key={i.id}>
            <TableCell>
              <a
                href={i.url}
                className="text-blue-700 hover:underline dark:text-blue-400"
                target="_blank"
                rel="noreferrer"
              >
                {i.title ?? i.url}
              </a>
              {i.discovered_at && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Discovered {i.discovered_at.slice(0, 10)}
                </div>
              )}
            </TableCell>
            <TableCell>{i.publisher ?? "—"}</TableCell>
            <TableCell>
              <Badge variant="outline">{i.kind}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{i.evidence_class ?? "other"}</Badge>
            </TableCell>
            <TableCell>
              <DuplicateLevelBadge level={i.duplicate_level} />
            </TableCell>
            {showActions && (
              <TableCell>
                <InboxActions
                  url={i.url}
                  duplicateLevel={i.duplicate_level}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={cols} className="text-muted-foreground">
              No candidates
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
