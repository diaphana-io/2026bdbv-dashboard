import type { ResolveStatus } from "./curate-api";
import { withSession } from "./neo4j";

function newId(): string {
  return crypto.randomUUID();
}

export async function persistResolveConflict(
  conflictId: string,
  status: ResolveStatus,
): Promise<void> {
  await withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (cf:ClaimConflict {id: $id})
      SET cf.status = $status,
          cf.resolved_at = $resolved_at
      RETURN cf.id AS id
      `,
      {
        id: conflictId,
        status,
        resolved_at: new Date().toISOString(),
      },
    );
    if (res.records.length === 0) {
      throw new Error(`conflict_not_found:${conflictId}`);
    }
  });
}

export async function persistDismissSource(normalizedUrl: string): Promise<void> {
  await withSession(async (session) => {
    await session.run(
      `
      MERGE (d:DismissedSource {normalized_url: $normalized_url})
      SET d.dismissed_at = $dismissed_at
      WITH d
      OPTIONAL MATCH (s:SourceDocument {normalized_url: $normalized_url})
      FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
        SET s.curation_status = 'dismissed'
      )
      `,
      {
        normalized_url: normalizedUrl,
        dismissed_at: new Date().toISOString(),
      },
    );
  });
}

export async function persistReviewClaim(input: {
  action: "approve" | "reject";
  claimId?: string;
  rejectionReason?: string;
  claimType?: string;
  subjectRef?: string;
  asOfDate?: string;
  objectValue?: Record<string, unknown>;
  sourceUrl?: string | null;
  conflictsWithClaimId?: string | null;
}): Promise<{ claimId: string }> {
  return withSession(async (session) => {
    if (input.action === "reject") {
      const claimId = input.claimId ?? newId();
      await session.run(
        `
        MERGE (c:Claim {id: $id})
        SET c.review_status = 'rejected',
            c.rejection_reason = $reason,
            c.reviewed_at = $reviewed_at
        `,
        {
          id: claimId,
          reason: input.rejectionReason ?? "rejected",
          reviewed_at: new Date().toISOString(),
        },
      );
      return { claimId };
    }

    const claimId = input.claimId ?? newId();
    const fingerprint = [
      input.subjectRef,
      input.claimType,
      input.asOfDate,
      JSON.stringify(input.objectValue ?? {}),
    ].join("|");

    await session.run(
      `
      MERGE (c:Claim {id: $id})
      SET c.claim_type = $claim_type,
          c.subject_ref = $subject_ref,
          c.object_value_json = $object_value_json,
          c.as_of_date = $as_of_date,
          c.claim_fingerprint = $fingerprint,
          c.confidence = coalesce(c.confidence, 'human'),
          c.extractor = coalesce(c.extractor, 'human'),
          c.review_status = 'approved',
          c.reviewed_at = $reviewed_at,
          c.reviewed_by = 'curator',
          c.source_id = coalesce(c.source_id, $source_id)
      WITH c
      OPTIONAL MATCH (s:SourceDocument)
      WHERE $source_url IS NOT NULL
        AND (s.url = $source_url OR s.normalized_url = $source_url)
      FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
        MERGE (c)-[:FROM]->(s)
        SET c.source_id = s.id
      )
      `,
      {
        id: claimId,
        claim_type: input.claimType,
        subject_ref: input.subjectRef,
        object_value_json: JSON.stringify(input.objectValue ?? {}),
        as_of_date: input.asOfDate,
        fingerprint,
        reviewed_at: new Date().toISOString(),
        source_url: input.sourceUrl ?? null,
        source_id: newId(),
      },
    );

    if (input.conflictsWithClaimId) {
      const conflictId = newId();
      await session.run(
        `
        MATCH (a:Claim {id: $a}), (b:Claim {id: $b})
        MERGE (a)-[:CONFLICTS_WITH]->(b)
        MERGE (b)-[:CONFLICTS_WITH]->(a)
        MERGE (cf:ClaimConflict {id: $conflict_id})
        SET cf.subject_ref = a.subject_ref,
            cf.claim_type = a.claim_type,
            cf.status = 'open',
            cf.detected_at = $detected_at,
            cf.claim_a_id = a.id,
            cf.claim_b_id = b.id
        MERGE (cf)-[:SIDE_A]->(a)
        MERGE (cf)-[:SIDE_B]->(b)
        `,
        {
          a: claimId,
          b: input.conflictsWithClaimId,
          conflict_id: conflictId,
          detected_at: new Date().toISOString(),
        },
      );
    }

    return { claimId };
  });
}
