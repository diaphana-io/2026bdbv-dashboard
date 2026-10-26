import { normalizeUrl } from "../../../../lib/curate-api";
import {
  preferFixtureData,
  shouldPersistCurateTabular,
} from "../../../../lib/curate-data-source.server";
import { invalidateGraphReadCache } from "../../../../lib/data";
import { getDb } from "../../../../lib/d1";
import { persistAdoptSource } from "../../../../lib/d1-curate";

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
  if (await shouldPersistCurateTabular()) {
    const db = getDb();
    if (!db) {
      return Response.json({ error: "d1_unavailable" }, { status: 503 });
    }
    try {
      await persistAdoptSource(db, normalized);
      invalidateGraphReadCache();
      persisted = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "d1_write_failed";
      if (message.startsWith("source_not_found:")) {
        return Response.json({ error: "source_not_found" }, { status: 404 });
      }
      return Response.json({ error: message }, { status: 503 });
    }
  } else if (!(await preferFixtureData())) {
    return Response.json({ error: "d1_unavailable" }, { status: 503 });
  }

  return Response.json({
    normalized_url: normalized,
    curation_status: "fetched",
    persisted,
  });
}
