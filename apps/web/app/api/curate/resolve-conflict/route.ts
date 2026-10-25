import { isResolveStatus } from "../../../../lib/curate-api";
import { shouldUseNeo4j } from "../../../../lib/curate-data-source.server";
import { invalidateGraphReadCache } from "../../../../lib/data";
import { persistResolveConflict } from "../../../../lib/neo4j-curate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const conflictId = typeof record.conflict_id === "string" ? record.conflict_id : "";
  const status = record.status;

  if (!conflictId) {
    return Response.json({ error: "conflict_id required" }, { status: 400 });
  }
  if (!isResolveStatus(status)) {
    return Response.json(
      { error: "status must be resolved_a|resolved_b|resolved_neither" },
      { status: 400 },
    );
  }

  let persisted = false;
  if (await shouldUseNeo4j()) {
    try {
      await persistResolveConflict(conflictId, status);
      invalidateGraphReadCache();
      persisted = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "neo4j_write_failed";
      if (message.startsWith("conflict_not_found:")) {
        return Response.json({ error: "conflict_not_found" }, { status: 404 });
      }
      return Response.json({ error: message }, { status: 503 });
    }
  }

  return Response.json({
    conflict_id: conflictId,
    status,
    resolved: true,
    persisted,
    display_policy: "show_both_until_resolved",
  });
}
