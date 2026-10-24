import { normalizeUrl } from "../../../../lib/curate-api";
import { invalidateGraphReadCache } from "../../../../lib/data";
import { isNeo4jConfigured } from "../../../../lib/neo4j";
import { persistDismissSource } from "../../../../lib/neo4j-curate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const url = typeof record.url === "string" ? record.url : "";
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }

  const normalized = normalizeUrl(url);
  let persisted = false;
  if (isNeo4jConfigured()) {
    try {
      await persistDismissSource(normalized);
      invalidateGraphReadCache();
      persisted = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "neo4j_write_failed";
      return Response.json({ error: message }, { status: 503 });
    }
  }

  return Response.json({
    normalized_url: normalized,
    curation_status: "dismissed",
    persisted,
  });
}
