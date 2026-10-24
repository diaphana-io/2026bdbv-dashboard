import { getCaseDetail } from "../../../../lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "missing_id" }, { status: 400 });
  }
  const detail = await getCaseDetail(id);
  if (!detail) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(detail);
}
