import { fetchSourceBib } from "../../../../lib/fetch-source-bib.server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const identifier =
    typeof record.identifier === "string"
      ? record.identifier
      : typeof record.url === "string"
        ? record.url
        : "";

  const result = await fetchSourceBib(identifier);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.bib);
}
