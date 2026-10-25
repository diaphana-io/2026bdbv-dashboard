/**
 * D1 writers for Claim Curate tabular SoT (Phase 3).
 * Curate Claim tabular writers (Phase 3+); uses D1 batch() for multi-statement writes.
 */
import type { ResolveStatus } from "./curate-api";

function newId(): string {
  return crypto.randomUUID();
}

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

type ClaimDbRow = {
  id: string;
  source_id: string;
  claim_type: string;
  claim_category: string | null;
  subject_ref: string;
  object_value: string;
  as_of_date: string;
  claim_fingerprint: string | null;
  lineage_id: string | null;
  version: number | null;
  is_head: number | null;
  confidence: string | null;
  extractor: string | null;
  review_status: string;
  excerpt: string | null;
};

export type ClaimTabularRow = {
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

function claimFromDb(row: ClaimDbRow): ClaimTabularRow {
  const reviewStatus = String(row.review_status ?? "");
  return {
    id: row.id,
    lineage_id: row.lineage_id != null ? String(row.lineage_id) : null,
    version: row.version ?? 1,
    is_head:
      row.is_head == null
        ? reviewStatus === "approved"
        : Number(row.is_head) !== 0,
    claim_type: String(row.claim_type ?? ""),
    claim_category:
      row.claim_category != null ? String(row.claim_category) : null,
    subject_ref: String(row.subject_ref ?? ""),
    object_value: parseObjectValue(row.object_value),
    as_of_date: String(row.as_of_date ?? ""),
    confidence: row.confidence != null ? String(row.confidence) : null,
    extractor: row.extractor != null ? String(row.extractor) : null,
    review_status: reviewStatus,
    source_id: row.source_id != null ? String(row.source_id) : null,
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    claim_fingerprint:
      row.claim_fingerprint != null ? String(row.claim_fingerprint) : null,
  };
}

function insertAudit(
  db: D1Database,
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
): D1PreparedStatement {
  return db
    .prepare(
      `
      INSERT INTO curate_audit_events (
        id, at, actor, action, lineage_id, claim_id, source_id,
        from_version, to_version, reason, payload_digest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      newId(),
      new Date().toISOString(),
      event.actor,
      event.action,
      event.lineageId ?? null,
      event.claimId ?? null,
      event.sourceId ?? null,
      event.fromVersion ?? null,
      event.toVersion ?? null,
      event.reason ?? null,
      event.payloadDigest ?? null,
    );
}

async function lookupSourceIdByUrl(
  db: D1Database,
  sourceUrl: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `
      SELECT id FROM sources
      WHERE url = ? OR normalized_url = ?
      LIMIT 1
      `,
    )
    .bind(sourceUrl, sourceUrl)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/** Load a claim row for rollback / review. */
export async function loadClaimTabularRow(
  db: D1Database,
  claimId: string,
): Promise<ClaimTabularRow | null> {
  const row = await db
    .prepare(
      `
      SELECT id, source_id, claim_type, claim_category, subject_ref, object_value,
             as_of_date, claim_fingerprint, lineage_id, version, is_head,
             confidence, extractor, review_status, excerpt
      FROM claims WHERE id = ?
      LIMIT 1
      `,
    )
    .bind(claimId)
    .first<ClaimDbRow>();
  return row ? claimFromDb(row) : null;
}

export async function persistResolveConflict(
  db: D1Database,
  conflictId: string,
  status: ResolveStatus,
): Promise<void> {
  const result = await db
    .prepare(
      `
      UPDATE claim_conflicts
      SET status = ?, resolved_at = ?
      WHERE id = ?
      `,
    )
    .bind(status, new Date().toISOString(), conflictId)
    .run();
  const changes = Number(result.meta?.changes ?? 0);
  if (changes === 0) {
    throw new Error(`conflict_not_found:${conflictId}`);
  }
}

export async function persistDismissSource(
  db: D1Database,
  normalizedUrl: string,
): Promise<void> {
  const dismissedAt = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `
        INSERT INTO dismissed_sources (normalized_url, dismissed_at)
        VALUES (?, ?)
        ON CONFLICT(normalized_url) DO UPDATE SET dismissed_at = excluded.dismissed_at
        `,
      )
      .bind(normalizedUrl, dismissedAt),
    db
      .prepare(
        `
        UPDATE sources
        SET curation_status = 'dismissed'
        WHERE normalized_url = ?
        `,
      )
      .bind(normalizedUrl),
  ]);
}

/** Move Inbox candidate into Catalog (`fetched`). */
export async function persistAdoptSource(
  db: D1Database,
  normalizedUrl: string,
): Promise<void> {
  const result = await db
    .prepare(
      `
      UPDATE sources
      SET curation_status = 'fetched'
      WHERE normalized_url = ? AND curation_status = 'candidate'
      `,
    )
    .bind(normalizedUrl)
    .run();
  if (Number(result.meta?.changes ?? 0) === 0) {
    throw new Error(`source_not_found:${normalizedUrl}`);
  }
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
  db: D1Database,
  input: SubmitSourceInput,
): Promise<{ created: boolean; existingId?: string }> {
  const existing = await db
    .prepare(
      `
      SELECT id FROM sources WHERE normalized_url = ? LIMIT 1
      `,
    )
    .bind(input.normalizedUrl)
    .first<{ id: string }>();
  if (existing) {
    return { created: false, existingId: existing.id };
  }

  const discoveredAt = new Date().toISOString();
  await db
    .prepare(
      `
      INSERT INTO sources (
        id, url, normalized_url, title, publisher, kind, evidence_class,
        duplicate_level, curation_status, discovered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'none', 'candidate', ?)
      `,
    )
    .bind(
      input.id,
      input.url,
      input.normalizedUrl,
      input.title ?? null,
      input.publisher ?? null,
      input.kind,
      input.evidenceClass,
      discoveredAt,
    )
    .run();
  return { created: true };
}

export type UpdateSourceInput = {
  id: string;
  title?: string | null;
  publisher?: string | null;
  kind: string;
  evidenceClass: string;
};

export async function persistUpdateSource(
  db: D1Database,
  input: UpdateSourceInput,
): Promise<void> {
  const result = await db
    .prepare(
      `
      UPDATE sources
      SET title = ?, publisher = ?, kind = ?, evidence_class = ?
      WHERE id = ? AND curation_status = 'candidate'
      `,
    )
    .bind(
      input.title ?? null,
      input.publisher ?? null,
      input.kind,
      input.evidenceClass,
      input.id,
    )
    .run();
  if (Number(result.meta?.changes ?? 0) === 0) {
    throw new Error(`source_not_found:${input.id}`);
  }
}

export async function persistReviewClaim(
  db: D1Database,
  input: {
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
  },
): Promise<{ claimId: string; lineageId: string }> {
  if (input.action === "reject") {
    const claimId = input.claimId ?? newId();
    const reviewedAt = new Date().toISOString();
    const existing = await loadClaimTabularRow(db, claimId);

    if (existing) {
      const lineage = existing.lineage_id ?? newId();
      const version = existing.version;
      await db.batch([
        db
          .prepare(
            `
            UPDATE claims
            SET review_status = 'rejected',
                rejection_reason = ?,
                reviewed_at = ?,
                lineage_id = coalesce(lineage_id, ?),
                version = coalesce(version, 1),
                is_head = 0
            WHERE id = ?
            `,
          )
          .bind(
            input.rejectionReason ?? "rejected",
            reviewedAt,
            lineage,
            claimId,
          ),
        insertAudit(db, {
          action: "reject",
          actor: "curator",
          lineageId: lineage,
          claimId,
          sourceId: existing.source_id,
          fromVersion: version,
          toVersion: version,
          reason: input.rejectionReason ?? "rejected",
        }),
      ]);
      return { claimId, lineageId: lineage };
    }

    // New reject row needs a sources FK — resolve via sourceUrl if present.
    let sourceId: string | null = null;
    if (input.sourceUrl) {
      sourceId = await lookupSourceIdByUrl(db, input.sourceUrl);
    }
    if (!sourceId) {
      throw new Error("source_not_found_for_claim");
    }
    const lineageId = newId();
    await db.batch([
      db
        .prepare(
          `
          INSERT INTO claims (
            id, source_id, claim_type, claim_category, subject_ref, object_value,
            as_of_date, claim_fingerprint, lineage_id, version, is_head,
            confidence, extractor, review_status, reviewed_at, rejection_reason
          ) VALUES (
            ?, ?, 'unknown', 'other', 'unknown', '{}',
            date('now'), 'reject-placeholder', ?, 1, 0,
            'human', 'human', 'rejected', ?, ?
          )
          `,
        )
        .bind(
          claimId,
          sourceId,
          lineageId,
          reviewedAt,
          input.rejectionReason ?? "rejected",
        ),
      insertAudit(db, {
        action: "reject",
        actor: "curator",
        lineageId,
        claimId,
        sourceId,
        fromVersion: 1,
        toVersion: 1,
        reason: input.rejectionReason ?? "rejected",
      }),
    ]);
    return { claimId, lineageId };
  }

  const claimId = input.claimId ?? newId();
  const fingerprint = [
    input.subjectRef,
    input.claimType,
    input.asOfDate,
    JSON.stringify(input.objectValue ?? {}),
  ].join("|");
  const reviewedAt = new Date().toISOString();
  const existing = await loadClaimTabularRow(db, claimId);

  let sourceId = existing?.source_id ?? null;
  if (!sourceId && input.sourceUrl) {
    sourceId = await lookupSourceIdByUrl(db, input.sourceUrl);
  }
  if (!sourceId) {
    throw new Error("source_not_found_for_claim");
  }

  const lineageId = existing?.lineage_id ?? newId();
  const version = existing?.version ?? 1;
  const stmts: D1PreparedStatement[] = [];

  if (existing) {
    stmts.push(
      db
        .prepare(
          `
          UPDATE claims
          SET claim_type = ?,
              claim_category = ?,
              subject_ref = ?,
              object_value = ?,
              as_of_date = ?,
              claim_fingerprint = ?,
              confidence = coalesce(confidence, 'human'),
              extractor = coalesce(extractor, 'human'),
              review_status = 'approved',
              reviewed_at = ?,
              reviewed_by = 'curator',
              source_id = ?,
              lineage_id = coalesce(lineage_id, ?),
              version = coalesce(version, 1),
              is_head = 1,
              rejection_reason = NULL
          WHERE id = ?
          `,
        )
        .bind(
          input.claimType,
          input.claimCategory ?? "other",
          input.subjectRef,
          JSON.stringify(input.objectValue ?? {}),
          input.asOfDate,
          fingerprint,
          reviewedAt,
          sourceId,
          lineageId,
          claimId,
        ),
    );
  } else {
    stmts.push(
      db
        .prepare(
          `
          INSERT INTO claims (
            id, source_id, claim_type, claim_category, subject_ref, object_value,
            as_of_date, claim_fingerprint, lineage_id, version, is_head,
            confidence, extractor, review_status, reviewed_at, reviewed_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'human', 'human', 'approved', ?, 'curator')
          `,
        )
        .bind(
          claimId,
          sourceId,
          input.claimType,
          input.claimCategory ?? "other",
          input.subjectRef,
          JSON.stringify(input.objectValue ?? {}),
          input.asOfDate,
          fingerprint,
          lineageId,
          version,
          reviewedAt,
        ),
    );
  }

  stmts.push(
    insertAudit(db, {
      action: "approve",
      actor: "curator",
      lineageId,
      claimId,
      sourceId,
      fromVersion: version,
      toVersion: version,
    }),
  );

  if (input.conflictsWithClaimId) {
    const other = await loadClaimTabularRow(db, input.conflictsWithClaimId);
    if (!other) {
      throw new Error(`claim_not_found:${input.conflictsWithClaimId}`);
    }
    const conflictId = newId();
    stmts.push(
      db
        .prepare(
          `
          INSERT INTO claim_conflicts (
            id, claim_a_id, claim_b_id, subject_ref, claim_type, status, detected_at
          ) VALUES (?, ?, ?, ?, ?, 'open', ?)
          `,
        )
        .bind(
          conflictId,
          claimId,
          input.conflictsWithClaimId,
          input.subjectRef ?? other.subject_ref,
          input.claimType ?? other.claim_type,
          reviewedAt,
        ),
    );
  }

  await db.batch(stmts);
  return { claimId, lineageId };
}

export type RollbackPersistInput = {
  head: ClaimTabularRow;
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
  db: D1Database,
  input: RollbackPersistInput,
): Promise<{ newClaimId: string }> {
  const head = await loadClaimTabularRow(db, input.head.id);
  if (!head) {
    throw new Error(`claim_not_found:${input.head.id}`);
  }

  const p = input.pending;
  const sourceId = p.source_id ?? head.source_id;
  if (!sourceId) {
    throw new Error("source_not_found_for_claim");
  }
  const fingerprint =
    p.claim_fingerprint ??
    [p.subject_ref, p.claim_type, p.as_of_date, JSON.stringify(p.object_value)].join(
      "|",
    );

  await db.batch([
    db
      .prepare(
        `
        UPDATE claims
        SET review_status = 'superseded', is_head = 0
        WHERE id = ?
        `,
      )
      .bind(input.head.id),
    db
      .prepare(
        `
        INSERT INTO claims (
          id, source_id, claim_type, claim_category, subject_ref, object_value,
          as_of_date, claim_fingerprint, lineage_id, version, is_head,
          needs_revision, confidence, excerpt, extractor, review_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'pending_review')
        `,
      )
      .bind(
        p.id,
        sourceId,
        p.claim_type,
        p.claim_category ?? "other",
        p.subject_ref,
        JSON.stringify(p.object_value ?? {}),
        p.as_of_date,
        fingerprint,
        p.lineage_id,
        p.version,
        p.confidence ?? "human",
        p.excerpt ?? null,
        p.extractor ?? "human",
      ),
    insertAudit(db, {
      action: "rollback",
      actor: input.audit.actor,
      lineageId: input.audit.lineage_id,
      claimId: input.audit.claim_id,
      sourceId,
      fromVersion: input.audit.from_version,
      toVersion: input.audit.to_version,
      reason: input.audit.reason,
      payloadDigest: input.audit.payload_digest ?? null,
    }),
  ]);

  return { newClaimId: p.id };
}
