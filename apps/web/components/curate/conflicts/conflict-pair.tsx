type ClaimSnippet = {
  id: string;
  source_label: string;
  as_of_date: string;
  summary: string;
  confidence: string;
};

export function ConflictPair({
  claimA,
  claimB,
}: {
  claimA: ClaimSnippet;
  claimB: ClaimSnippet;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 md:grid-cols-2">
      <ConflictClaimCard side="A" claim={claimA} />
      <ConflictClaimCard side="B" claim={claimB} />
    </div>
  );
}

function ConflictClaimCard({
  side,
  claim,
}: {
  side: "A" | "B";
  claim: ClaimSnippet;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-amber-800">Conflict {side}</span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5">{claim.confidence}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{claim.summary}</div>
      <div className="mt-2 text-xs text-zinc-600">
        {claim.source_label} · as-of {claim.as_of_date}
      </div>
    </div>
  );
}
