import { normalizeUrl } from "../../../../lib/curate-api";

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
  return Response.json({
    normalized_url: normalized,
    curation_status: "dismissed",
    persisted: false,
  });
}
