import {
  preferFixtureData,
  shouldPersistCurateTabular,
} from "../../../../lib/curate-data-source.server";
import { invalidateGraphReadCache } from "../../../../lib/data";
import { getDb } from "../../../../lib/d1";
import { persistUpdateSource } from "../../../../lib/d1-curate";
import {
  isEvidenceClass,
  isSourceKind,
} from "../../../../lib/source-enums";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const kind =
    typeof record.kind === "string" && isSourceKind(record.kind)
      ? record.kind
      : null;
  if (!kind) {
    return Response.json({ error: "kind required" }, { status: 400 });
  }
  const evidenceClass =
    typeof record.evidence_class === "string" &&
    isEvidenceClass(record.evidence_class)
      ? record.evidence_class
      : null;
  if (!evidenceClass) {
    return Response.json({ error: "evidence_class required" }, { status: 400 });
  }

  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : null;
  const publisher =
    typeof record.publisher === "string" && record.publisher.trim()
      ? record.publisher.trim()
      : null;

  let persisted = false;
  if (await shouldPersistCurateTabular()) {
    const db = getDb();
    if (!db) {
      return Response.json({ error: "d1_unavailable" }, { status: 503 });
    }
    try {
      await persistUpdateSource(db, {
        id,
        title,
        publisher,
        kind,
        evidenceClass,
      });
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
    id,
    title,
    publisher,
    kind,
    evidence_class: evidenceClass,
    persisted,
  });
}
