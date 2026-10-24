import { getMapSnapshot } from "../../../../lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") ?? "2026-10-23";
  const snapshot = await getMapSnapshot(asOf);
  return Response.json(snapshot);
}
