import { normalizeUrl } from "../../../../lib/curate-api";
import {
  preferFixtureData,
  shouldPersistCurateTabular,
} from "../../../../lib/curate-data-source.server";
import { invalidateGraphReadCache } from "../../../../lib/data";
import { getDb } from "../../../../lib/d1";
import { persistSubmitSource } from "../../../../lib/d1-curate";
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
  const url = typeof record.url === "string" ? record.url.trim() : "";
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }

  const kind =
    typeof record.kind === "string" && isSourceKind(record.kind)
      ? record.kind
      : "other";
  const evidenceClass =
    typeof record.evidence_class === "string" &&
    isEvidenceClass(record.evidence_class)
      ? record.evidence_class
      : "other";
  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : null;
  const publisher =
    typeof record.publisher === "string" && record.publisher.trim()
      ? record.publisher.trim()
      : null;

  const normalized = normalizeUrl(url);
  const id = crypto.randomUUID();
  const discoveredAt = new Date().toISOString();

  let persisted = false;
  if (await shouldPersistCurateTabular()) {
    const db = getDb();
    if (!db) {
      return Response.json({ error: "d1_unavailable" }, { status: 503 });
    }
    try {
      const result = await persistSubmitSource(db, {
        id,
        url,
        normalizedUrl: normalized,
        title,
        publisher,
        kind,
        evidenceClass,
      });
      if (!result.created) {
        return Response.json(
          {
            error: "duplicate_url",
            existing_id: result.existingId,
            normalized_url: normalized,
          },
          { status: 409 },
        );
      }
      invalidateGraphReadCache();
      persisted = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "d1_write_failed";
      return Response.json({ error: message }, { status: 503 });
    }
  } else if (!(await preferFixtureData())) {
    return Response.json({ error: "d1_unavailable" }, { status: 503 });
  }

  return Response.json({
    id,
    url,
    normalized_url: normalized,
    title,
    publisher,
    kind,
    evidence_class: evidenceClass,
    duplicate_level: "none",
    curation_status: "candidate",
    discovered_at: discoveredAt,
    persisted,
  });
}
