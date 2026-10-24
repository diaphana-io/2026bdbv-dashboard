import { isResolveStatus } from "../../../../lib/curate-api";

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

  // Staging: validate + acknowledge. Persistence lands with Neo4j wiring.
  return Response.json({
    conflict_id: conflictId,
    status,
    resolved: true,
    persisted: false,
    display_policy: "show_both_until_resolved",
  });
}
