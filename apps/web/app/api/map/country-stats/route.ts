import { getCountryStats } from "../../../../lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") ?? undefined;
  const rows = await getCountryStats(asOf ?? undefined);
  return Response.json(rows);
}