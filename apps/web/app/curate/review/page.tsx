import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ClaimReviewForm } from "../../../components/curate/claim-review-form";

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
          <CardContent>
            <ClaimReviewForm sourceUrl={url} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
