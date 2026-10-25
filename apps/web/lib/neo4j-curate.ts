import type { ResolveStatus } from "./curate-api";
import { withSession } from "./neo4j";

function newId(): string {
  return crypto.randomUUID();
}

async function createAuditEvent(
  session: {
    run: (
      cypher: string,
      params?: Record<string, unknown>,
    ) => Promise<unknown>;
  },
  event: {
    action: string;
    actor: string;
    lineageId?: string | null;
    claimId?: string | null;
    sourceId?: string | null;
    fromVersion?: number | null;
    toVersion?: number | null;
    reason?: string | null;
    payloadDigest?: string | null;
  },
): Promise<void> {
  await session.run(
    `
    CREATE (a:CurateAuditEvent {
      id: $id,
      at: $at,
      actor: $actor,
      action: $action,
      lineage_id: $lineage_id,
      claim_id: $claim_id,
      source_id: $source_id,
      from_version: $from_version,
      to_version: $to_version,
      reason: $reason,
      payload_digest: $payload_digest
    })
    `,
    {
      id: newId(),
      at: new Date().toISOString(),
      actor: event.actor,
      action: event.action,
      lineage_id: event.lineageId ?? null,
      claim_id: event.claimId ?? null,
      source_id: event.sourceId ?? null,
      from_version: event.fromVersion ?? null,
      to_version: event.toVersion ?? null,
      reason: event.reason ?? null,
      payload_digest: event.payloadDigest ?? null,
    },
  );
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

export type SubmitSourceInput = {
  id: string;
  url: string;
  normalizedUrl: string;
  title?: string | null;
  publisher?: string | null;
  kind: string;
  evidenceClass: string;
};

/** Enqueue a manual Inbox candidate. Exact normalized URL match → conflict. */
export async function persistSubmitSource(
  input: SubmitSourceInput,
): Promise<{ created: boolean; existingId?: string }> {
  return withSession(async (session) => {
    const existing = await session.run(
      `
      MATCH (s:SourceDocument {normalized_url: $normalized_url})
      RETURN s.id AS id
      LIMIT 1
      `,
      { normalized_url: input.normalizedUrl },
    );
    if (existing.records.length > 0) {
      return {
        created: false,
        existingId: String(existing.records[0]!.get("id")),
      };
    }

    const discoveredAt = new Date().toISOString();
    await session.run(
      `
      CREATE (s:SourceDocument {
        id: $id,
        url: $url,
        normalized_url: $normalized_url,
        title: $title,
        publisher: $publisher,
        kind: $kind,
        evidence_class: $evidence_class,
        duplicate_level: 'none',
        curation_status: 'candidate',
        discovered_at: $discovered_at
      })
      `,
      {
        id: input.id,
        url: input.url,
        normalized_url: input.normalizedUrl,
        title: input.title ?? null,
        publisher: input.publisher ?? null,
        kind: input.kind,
        evidence_class: input.evidenceClass,
        discovered_at: discoveredAt,
      },
    );
    return { created: true };
  });
}

export type UpdateSourceInput = {
  id: string;
  title?: string | null;
  publisher?: string | null;
  kind: string;
  evidenceClass: string;
};

export async function persistUpdateSource(
  input: UpdateSourceInput,
): Promise<void> {
  await withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (s:SourceDocument {id: $id})
      WHERE s.curation_status = 'candidate'
      SET s.title = $title,
          s.publisher = $publisher,
          s.kind = $kind,
          s.evidence_class = $evidence_class
      RETURN s.id AS id
      `,
      {
        id: input.id,
        title: input.title ?? null,
        publisher: input.publisher ?? null,
        kind: input.kind,
        evidence_class: input.evidenceClass,
      },
    );
    if (res.records.length === 0) {
      throw new Error(`source_not_found:${input.id}`);
    }
  });
}

export type ClaimGraphRow = {
  id: string;
  lineage_id: string | null;
  version: number;
  is_head: boolean;
  claim_type: string;
  claim_category: string | null;
  subject_ref: string;
  object_value: Record<string, unknown>;
  as_of_date: string;
  confidence: string | null;
  extractor: string | null;
  review_status: string;
  source_id: string | null;
  excerpt: string | null;
  claim_fingerprint: string | null;
};

function parseObjectValue(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

export async function loadClaimGraphRow(
  claimId: string,
): Promise<ClaimGraphRow | null> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (c:Claim {id: $id})
      RETURN c
      LIMIT 1
      `,
      { id: claimId },
    );
    if (res.records.length === 0) return null;
    const p = (res.records[0].get("c").properties ?? {}) as Record<
      string,
      unknown
    >;
    const versionRaw = p.version;
    const version =
      typeof versionRaw === "number"
        ? versionRaw
        : versionRaw &&
            typeof versionRaw === "object" &&
            "toNumber" in versionRaw
          ? (versionRaw as { toNumber: () => number }).toNumber()
          : 1;
    const reviewStatus = String(p.review_status ?? "");
    return {
      id: String(p.id),
      lineage_id: p.lineage_id != null ? String(p.lineage_id) : null,
      version,
      // Legacy nodes without is_head: treat approved as head.
      is_head:
        p.is_head == null
          ? reviewStatus === "approved"
          : Boolean(p.is_head),
      claim_type: String(p.claim_type ?? ""),
      claim_category: p.claim_category != null ? String(p.claim_category) : null,
      subject_ref: String(p.subject_ref ?? ""),
      object_value: parseObjectValue(p.object_value_json),
      as_of_date: String(p.as_of_date ?? ""),
      confidence: p.confidence != null ? String(p.confidence) : null,
      extractor: p.extractor != null ? String(p.extractor) : null,
      review_status: reviewStatus,
      source_id: p.source_id != null ? String(p.source_id) : null,
      excerpt: p.excerpt != null ? String(p.excerpt) : null,
      claim_fingerprint:
        p.claim_fingerprint != null ? String(p.claim_fingerprint) : null,
    };
  });
}

export async function persistReviewClaim(input: {
  action: "approve" | "reject";
  claimId?: string;
  rejectionReason?: string;
  claimType?: string;
  claimCategory?: string;
  subjectRef?: string;
  asOfDate?: string;
  objectValue?: Record<string, unknown>;
  sourceUrl?: string | null;
  conflictsWithClaimId?: string | null;
}): Promise<{ claimId: string; lineageId: string }> {
  return withSession(async (session) => {
    if (input.action === "reject") {
      const claimId = input.claimId ?? newId();
      const lineageId = newId();
      const reviewedAt = new Date().toISOString();
      await session.run(
        `
        MERGE (c:Claim {id: $id})
        SET c.review_status = 'rejected',
            c.rejection_reason = $reason,
            c.reviewed_at = $reviewed_at,
            c.lineage_id = coalesce(c.lineage_id, $lineage_id),
            c.version = coalesce(c.version, 1),
            c.is_head = false
        RETURN c.lineage_id AS lineage_id, c.version AS version
        `,
        {
          id: claimId,
          reason: input.rejectionReason ?? "rejected",
          reviewed_at: reviewedAt,
          lineage_id: lineageId,
        },
      );
      const after = await session.run(
        `MATCH (c:Claim {id: $id}) RETURN c.lineage_id AS lineage_id, c.version AS version`,
        { id: claimId },
      );
      const lineage =
        after.records[0]?.get("lineage_id") != null
          ? String(after.records[0].get("lineage_id"))
          : lineageId;
      const versionRaw = after.records[0]?.get("version");
      const version =
        typeof versionRaw === "number"
          ? versionRaw
          : versionRaw &&
              typeof versionRaw === "object" &&
              "toNumber" in versionRaw
            ? (versionRaw as { toNumber: () => number }).toNumber()
            : 1;
      await createAuditEvent(session, {
        action: "reject",
        actor: "curator",
        lineageId: lineage,
        claimId,
        fromVersion: version,
        toVersion: version,
        reason: input.rejectionReason ?? "rejected",
      });
      return { claimId, lineageId: lineage };
    }

    const claimId = input.claimId ?? newId();
    const lineageId = newId();
    const fingerprint = [
      input.subjectRef,
      input.claimType,
      input.asOfDate,
      JSON.stringify(input.objectValue ?? {}),
    ].join("|");
    const reviewedAt = new Date().toISOString();

    const res = await session.run(
      `
      MERGE (c:Claim {id: $id})
      SET c.claim_type = $claim_type,
          c.claim_category = $claim_category,
          c.subject_ref = $subject_ref,
          c.object_value_json = $object_value_json,
          c.as_of_date = $as_of_date,
          c.claim_fingerprint = $fingerprint,
          c.confidence = coalesce(c.confidence, 'human'),
          c.extractor = coalesce(c.extractor, 'human'),
          c.review_status = 'approved',
          c.reviewed_at = $reviewed_at,
          c.reviewed_by = 'curator',
          c.source_id = coalesce(c.source_id, $source_id),
          c.lineage_id = coalesce(c.lineage_id, $lineage_id),
          c.version = coalesce(c.version, 1),
          c.is_head = true
      WITH c
      OPTIONAL MATCH (s:SourceDocument)
      WHERE $source_url IS NOT NULL
        AND (s.url = $source_url OR s.normalized_url = $source_url)
      FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
        MERGE (c)-[:FROM]->(s)
        SET c.source_id = s.id
      )
      RETURN c.lineage_id AS lineage_id, c.version AS version, c.source_id AS source_id
      `,
      {
        id: claimId,
        claim_type: input.claimType,
        claim_category: input.claimCategory ?? "other",
        subject_ref: input.subjectRef,
        object_value_json: JSON.stringify(input.objectValue ?? {}),
        as_of_date: input.asOfDate,
        fingerprint,
        reviewed_at: reviewedAt,
        source_url: input.sourceUrl ?? null,
        source_id: newId(),
        lineage_id: lineageId,
      },
    );

    const lineage =
      res.records[0]?.get("lineage_id") != null
        ? String(res.records[0].get("lineage_id"))
        : lineageId;
    const versionRaw = res.records[0]?.get("version");
    const version =
      typeof versionRaw === "number"
        ? versionRaw
        : versionRaw &&
            typeof versionRaw === "object" &&
            "toNumber" in versionRaw
          ? (versionRaw as { toNumber: () => number }).toNumber()
          : 1;
    const sourceId =
      res.records[0]?.get("source_id") != null
        ? String(res.records[0].get("source_id"))
        : null;

    await createAuditEvent(session, {
      action: "approve",
      actor: "curator",
      lineageId: lineage,
      claimId,
      sourceId,
      fromVersion: version,
      toVersion: version,
    });

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

    return { claimId, lineageId: lineage };
  });
}

export type RollbackPersistInput = {
  head: ClaimGraphRow;
  pending: {
    id: string;
    lineage_id: string;
    version: number;
    claim_type: string;
    claim_category?: string | null;
    subject_ref: string;
    object_value: Record<string, unknown>;
    as_of_date: string;
    confidence?: string | null;
    extractor?: string | null;
    source_id?: string | null;
    excerpt?: string | null;
    claim_fingerprint?: string | null;
  };
  audit: {
    actor: string;
    lineage_id: string;
    claim_id: string;
    from_version: number;
    to_version: number;
    reason: string;
    payload_digest?: string | null;
  };
};

/** Withdraw approved head immediately; create pending lineage version + audit. */
export async function persistRollbackClaim(
  input: RollbackPersistInput,
): Promise<{ newClaimId: string }> {
  return withSession(async (session) => {
    const headRes = await session.run(
      `
      MATCH (c:Claim {id: $id})
      RETURN c.review_status AS review_status, c.is_head AS is_head
      `,
      { id: input.head.id },
    );
    if (headRes.records.length === 0) {
      throw new Error(`claim_not_found:${input.head.id}`);
    }

    const p = input.pending;
    const fingerprint =
      p.claim_fingerprint ??
      [p.subject_ref, p.claim_type, p.as_of_date, JSON.stringify(p.object_value)].join(
        "|",
      );

    await session.run(
      `
      MATCH (old:Claim {id: $old_id})
      SET old.review_status = 'superseded',
          old.is_head = false
      WITH old
      CREATE (neu:Claim {
        id: $new_id,
        lineage_id: $lineage_id,
        version: $version,
        claim_type: $claim_type,
        claim_category: $claim_category,
        subject_ref: $subject_ref,
        object_value_json: $object_value_json,
        as_of_date: $as_of_date,
        claim_fingerprint: $fingerprint,
        confidence: $confidence,
        extractor: $extractor,
        review_status: 'pending_review',
        is_head: false,
        needs_revision: false,
        source_id: $source_id,
        excerpt: $excerpt
      })
      MERGE (neu)-[:SUPERSEDES]->(old)
      WITH neu, old
      OPTIONAL MATCH (old)-[:FROM]->(s:SourceDocument)
      FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
        MERGE (neu)-[:FROM]->(s)
        SET neu.source_id = coalesce(neu.source_id, s.id)
      )
      `,
      {
        old_id: input.head.id,
        new_id: p.id,
        lineage_id: p.lineage_id,
        version: p.version,
        claim_type: p.claim_type,
        claim_category: p.claim_category ?? "other",
        subject_ref: p.subject_ref,
        object_value_json: JSON.stringify(p.object_value ?? {}),
        as_of_date: p.as_of_date,
        fingerprint,
        confidence: p.confidence ?? "human",
        extractor: p.extractor ?? "human",
        source_id: p.source_id ?? input.head.source_id,
        excerpt: p.excerpt ?? null,
      },
    );

    await createAuditEvent(session, {
      action: "rollback",
      actor: input.audit.actor,
      lineageId: input.audit.lineage_id,
      claimId: input.audit.claim_id,
      sourceId: p.source_id ?? input.head.source_id,
      fromVersion: input.audit.from_version,
      toVersion: input.audit.to_version,
      reason: input.audit.reason,
      payloadDigest: input.audit.payload_digest ?? null,
    });

    return { newClaimId: p.id };
  });
}
