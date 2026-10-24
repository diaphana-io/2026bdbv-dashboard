export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = record.action;
  if (action !== "approve" && action !== "reject") {
    return Response.json({ error: "action must be approve|reject" }, { status: 400 });
  }

  const extractEnabled = process.env.EXTRACT_ENABLED === "true";
  const appEnv = process.env.APP_ENV ?? "staging";
  if (appEnv === "production" && extractEnabled) {
    return Response.json(
      { error: "Extract-enabled production is blocked until Extract spec is approved" },
      { status: 503 },
    );
  }

  if (action === "reject") {
    const reason =
      typeof record.rejection_reason === "string" && record.rejection_reason
        ? record.rejection_reason
        : "rejected";
    return Response.json({
      review_status: "rejected",
      rejection_reason: reason,
      persisted: false,
    });
  }

  if (record.duplicate === true) {
    return Response.json({ error: "exact duplicate cannot be approved" }, { status: 409 });
  }

  const claimType = typeof record.claim_type === "string" ? record.claim_type : "";
  const subjectRef = typeof record.subject_ref === "string" ? record.subject_ref : "";
  const asOfDate = typeof record.as_of_date === "string" ? record.as_of_date : "";
  if (!claimType || !subjectRef || !asOfDate) {
    return Response.json(
      { error: "claim_type, subject_ref, and as_of_date are required" },
      { status: 400 },
    );
  }

  let objectValue = record.object_value;
  if (typeof objectValue === "string") {
    try {
      objectValue = JSON.parse(objectValue);
    } catch {
      return Response.json({ error: "object_value must be valid JSON" }, { status: 400 });
    }
  }
  if (!objectValue || typeof objectValue !== "object") {
    return Response.json({ error: "object_value required" }, { status: 400 });
  }

  return Response.json({
    review_status: "approved",
    applied: true,
    open_conflict: Boolean(record.conflicts_with_claim_id),
    conflicts_with_claim_id: record.conflicts_with_claim_id ?? null,
    display_policy: "show_both_until_resolved",
    persisted: false,
    claim: {
      claim_type: claimType,
      subject_ref: subjectRef,
      as_of_date: asOfDate,
      object_value: objectValue,
      source_url: typeof record.source_url === "string" ? record.source_url : null,
    },
  });
}
