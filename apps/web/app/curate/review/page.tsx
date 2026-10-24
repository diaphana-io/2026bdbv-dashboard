import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";

export default async function CurateReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const sp = await searchParams;
  const url = sp.url ?? "";

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Review</h1>
        <Badge variant="secondary">CF Access</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="text-sm font-semibold">Source</CardHeader>
          <CardContent className="text-sm break-all text-zinc-700">
            {url || "No source URL"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-semibold">Claim</CardHeader>
          <CardContent className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-600">claim_type</label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              defaultValue="case_count"
            />
            <label className="text-xs font-medium text-zinc-600">subject_ref</label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              defaultValue="KE"
            />
            <label className="text-xs font-medium text-zinc-600">as_of_date</label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              defaultValue="2026-10-20"
            />
            <label className="text-xs font-medium text-zinc-600">object_value (JSON)</label>
            <textarea
              className="min-h-24 rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs"
              defaultValue='{"confirmed":9,"deaths":1}'
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button">Approve</Button>
              <Button type="button" variant="destructive">
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
