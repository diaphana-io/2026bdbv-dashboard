/**
 * D1 readers for Claim Curate tabular SoT (Phase 2).
 * Row shapes match data-types / Neo4j + JSON facades.
 */
import type {
  CatalogAuditSnippet,
  CatalogClaimRow,
  CatalogSourceDetail,
  CatalogSourceRow,
  ClaimRow,
  ConflictView,
  DuplicateLevel,
  InboxRow,
  SourceRow,
} from "./data-types";

const CATALOG_STATUSES = ["fetched", "extracted", "in_review", "done"] as const;

type SourceDbRow = {
  id: string;
  url: string;
  normalized_url: string | null;
  title: string | null;
  publisher: string | null;
  kind: string;
  evidence_class: string | null;
  duplicate_level: string | null;
  duplicate_of_source_id: string | null;
  published_at: string | null;
  discovered_at: string | null;
  curation_status: string;
};

type ClaimDbRow = {
  id: string;
  source_id: string;
  claim_type: string;
  claim_category: string | null;
  subject_ref: string;
  object_value: string;
  as_of_date: string;
  confidence: string;
  review_status: string;
  excerpt: string | null;
  lineage_id: string | null;
  version: number | null;
  is_head: number | null;
  extractor: string | null;
  reviewed_at: string | null;
  review_policy: string | null;
};

type ConflictDbRow = {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  subject_ref: string;
  claim_type: string;
  status: string;
  detected_at: string;
};

type AuditDbRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  lineage_id: string | null;
  claim_id: string | null;
  from_version: number | null;
  to_version: number | null;
  reason: string | null;
};

function parseObjectValue(raw: string | null | undefined): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function intToBool(v: number | null | undefined): boolean | undefined {
  if (v == null) return undefined;
  return Number(v) !== 0;
}

function sourceFromDb(row: SourceDbRow): SourceRow {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    publisher: row.publisher,
    kind: row.kind,
    published_at: row.published_at,
    curation_status: row.curation_status,
    normalized_url: row.normalized_url ?? undefined,
    evidence_class: row.evidence_class ?? undefined,
    discovered_at: row.discovered_at ?? undefined,
  };
}

function claimFromDb(row: ClaimDbRow): ClaimRow {
  return {
    id: row.id,
    claim_type: row.claim_type,
    claim_category: row.claim_category ?? undefined,
    subject_ref: row.subject_ref,
    object_value: parseObjectValue(row.object_value),
    as_of_date: row.as_of_date,
    confidence: row.confidence,
    review_status: row.review_status,
    source_id: row.source_id,
    excerpt: row.excerpt ?? undefined,
    lineage_id: row.lineage_id ?? undefined,
    version: row.version ?? undefined,
    is_head: intToBool(row.is_head),
    extractor: row.extractor ?? undefined,
    reviewed_at: row.reviewed_at ?? undefined,
  };
}

function auditFromDb(row: AuditDbRow): CatalogAuditSnippet {
  return {
    id: row.id,
    at: row.at,
    actor: row.actor,
    action: row.action,
    lineage_id: row.lineage_id,
    claim_id: row.claim_id,
    from_version: row.from_version,
    to_version: row.to_version,
    reason: row.reason,
  };
}

function duplicateLevelOf(raw: string | null | undefined): DuplicateLevel {
  return raw === "exact_url" ||
    raw === "content_hash" ||
    raw === "possible" ||
    raw === "none"
    ? raw
    : "none";
}

/** Row count on `sources` — empty D1 is treated as a miss for Curate fallback. */
export async function sourcesRowCount(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM sources")
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function getSourcesD1(db: D1Database): Promise<SourceRow[]> {
  const { results } = await db
    .prepare(
      `
      SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
             duplicate_level, duplicate_of_source_id, published_at, discovered_at,
             curation_status
      FROM sources
      WHERE curation_status != 'candidate'
      ORDER BY coalesce(published_at, discovered_at)
      `,
    )
    .all<SourceDbRow>();
  return (results ?? []).map(sourceFromDb);
}

export async function getClaimsD1(db: D1Database): Promise<ClaimRow[]> {
  const { results } = await db
    .prepare(
      `
      SELECT id, source_id, claim_type, claim_category, subject_ref, object_value,
             as_of_date, confidence, review_status, excerpt, lineage_id, version,
             is_head, extractor, reviewed_at, review_policy
      FROM claims
      `,
    )
    .all<ClaimDbRow>();
  return (results ?? []).map(claimFromDb);
}

export async function getInboxCandidatesD1(db: D1Database): Promise<InboxRow[]> {
  const { results } = await db
    .prepare(
      `
      SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
             duplicate_level, duplicate_of_source_id, published_at, discovered_at,
             curation_status
      FROM sources
      WHERE curation_status = 'candidate'
      ORDER BY discovered_at DESC
      `,
    )
    .all<SourceDbRow>();
  return (results ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title ?? undefined,
    publisher: row.publisher ?? undefined,
    kind: row.kind,
    evidence_class: row.evidence_class ?? "other",
    duplicate_level: duplicateLevelOf(row.duplicate_level),
    duplicate_of_source_id: row.duplicate_of_source_id,
    curation_status: row.curation_status,
    discovered_at: row.discovered_at ?? undefined,
  }));
}

export async function getConflictViewsD1(db: D1Database): Promise<ConflictView[]> {
  const { results } = await db
    .prepare(
      `
      SELECT id, claim_a_id, claim_b_id, subject_ref, claim_type, status, detected_at
      FROM claim_conflicts
      WHERE status = 'open'
      ORDER BY detected_at
      `,
    )
    .all<ConflictDbRow>();

  const views: ConflictView[] = [];
  for (const cf of results ?? []) {
    const claimA = await db
      .prepare(
        `
        SELECT id, source_id, claim_type, claim_category, subject_ref, object_value,
               as_of_date, confidence, review_status, excerpt, lineage_id, version,
               is_head, extractor, reviewed_at, review_policy
        FROM claims WHERE id = ?
        `,
      )
      .bind(cf.claim_a_id)
      .first<ClaimDbRow>();
    const claimB = await db
      .prepare(
        `
        SELECT id, source_id, claim_type, claim_category, subject_ref, object_value,
               as_of_date, confidence, review_status, excerpt, lineage_id, version,
               is_head, extractor, reviewed_at, review_policy
        FROM claims WHERE id = ?
        `,
      )
      .bind(cf.claim_b_id)
      .first<ClaimDbRow>();
    if (!claimA || !claimB) continue;

    const sourceA = await db
      .prepare(
        `
        SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
               duplicate_level, duplicate_of_source_id, published_at, discovered_at,
               curation_status
        FROM sources WHERE id = ?
        `,
      )
      .bind(claimA.source_id)
      .first<SourceDbRow>();
    const sourceB = await db
      .prepare(
        `
        SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
               duplicate_level, duplicate_of_source_id, published_at, discovered_at,
               curation_status
        FROM sources WHERE id = ?
        `,
      )
      .bind(claimB.source_id)
      .first<SourceDbRow>();

    views.push({
      conflict: {
        id: cf.id,
        claim_a_id: cf.claim_a_id,
        claim_b_id: cf.claim_b_id,
        subject_ref: cf.subject_ref,
        claim_type: cf.claim_type,
        status: cf.status,
        detected_at: cf.detected_at,
      },
      claim_a: claimFromDb(claimA),
      claim_b: claimFromDb(claimB),
      source_a: sourceA ? sourceFromDb(sourceA) : undefined,
      source_b: sourceB ? sourceFromDb(sourceB) : undefined,
    });
  }
  return views;
}

function catalogSourceFromParts(
  s: SourceRow & { normalized_url?: string },
  claimRows: ClaimRow[],
): CatalogSourceRow {
  const extractors = [
    ...new Set(
      claimRows
        .map((c) => c.extractor)
        .filter((e): e is string => Boolean(e)),
    ),
  ];
  const latest_reviewed_at =
    claimRows
      .map((c) => c.reviewed_at)
      .filter((x): x is string => Boolean(x))
      .sort()
      .at(-1) ?? null;
  return {
    id: s.id,
    url: s.url,
    normalized_url: s.normalized_url ?? s.url,
    title: s.title ?? null,
    publisher: s.publisher ?? null,
    kind: s.kind,
    evidence_class: s.evidence_class,
    curation_status: s.curation_status,
    published_at: s.published_at ?? null,
    discovered_at: s.discovered_at ?? null,
    claim_count: claimRows.length,
    approved_count: claimRows.filter((c) => c.review_status === "approved")
      .length,
    pending_count: claimRows.filter(
      (c) => c.review_status === "pending_review",
    ).length,
    latest_reviewed_at,
    extractors,
  };
}

export async function getCatalogSourcesD1(
  db: D1Database,
  opts?: { includeDismissed?: boolean },
): Promise<CatalogSourceRow[]> {
  const statuses = opts?.includeDismissed
    ? [...CATALOG_STATUSES, "dismissed"]
    : [...CATALOG_STATUSES];
  const placeholders = statuses.map(() => "?").join(", ");
  const { results: sourceRows } = await db
    .prepare(
      `
      SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
             duplicate_level, duplicate_of_source_id, published_at, discovered_at,
             curation_status
      FROM sources
      WHERE curation_status IN (${placeholders})
      `,
    )
    .bind(...statuses)
    .all<SourceDbRow>();

  const allClaims = await getClaimsD1(db);
  const bySource = new Map<string, ClaimRow[]>();
  for (const c of allClaims) {
    const list = bySource.get(c.source_id) ?? [];
    list.push(c);
    bySource.set(c.source_id, list);
  }

  return (sourceRows ?? [])
    .map((row) => {
      const s = sourceFromDb(row);
      return catalogSourceFromParts(s, bySource.get(s.id) ?? []);
    })
    .sort((a, b) => {
      const ta =
        a.latest_reviewed_at ?? a.published_at ?? a.discovered_at ?? "";
      const tb =
        b.latest_reviewed_at ?? b.published_at ?? b.discovered_at ?? "";
      return tb.localeCompare(ta);
    });
}

export async function getSourceCatalogDetailD1(
  db: D1Database,
  key: string,
): Promise<CatalogSourceDetail | null> {
  const sourceRow = await db
    .prepare(
      `
      SELECT id, url, normalized_url, title, publisher, kind, evidence_class,
             duplicate_level, duplicate_of_source_id, published_at, discovered_at,
             curation_status
      FROM sources
      WHERE id = ? OR normalized_url = ? OR url = ?
      LIMIT 1
      `,
    )
    .bind(key, key, key)
    .first<SourceDbRow>();
  if (!sourceRow) return null;

  const catalogOk =
    (CATALOG_STATUSES as readonly string[]).includes(sourceRow.curation_status) ||
    sourceRow.curation_status === "dismissed";
  if (!catalogOk) return null;

  const { results: claimRows } = await db
    .prepare(
      `
      SELECT id, source_id, claim_type, claim_category, subject_ref, object_value,
             as_of_date, confidence, review_status, excerpt, lineage_id, version,
             is_head, extractor, reviewed_at, review_policy
      FROM claims
      WHERE source_id = ?
      ORDER BY coalesce(lineage_id, id), version
      `,
    )
    .bind(sourceRow.id)
    .all<ClaimDbRow>();

  const claims: CatalogClaimRow[] = [];
  for (const row of claimRows ?? []) {
    const mapped = claimFromDb(row);
    const { results: audits } = await db
      .prepare(
        `
        SELECT id, at, actor, action, lineage_id, claim_id, from_version, to_version, reason
        FROM curate_audit_events
        WHERE lineage_id = ? OR claim_id = ?
        ORDER BY at DESC
        LIMIT 5
        `,
      )
      .bind(mapped.lineage_id ?? mapped.id, mapped.id)
      .all<AuditDbRow>();

    claims.push({
      id: mapped.id,
      lineage_id: mapped.lineage_id ?? mapped.id,
      version: mapped.version ?? 1,
      is_head: mapped.is_head ?? mapped.review_status === "approved",
      claim_type: mapped.claim_type,
      claim_category: mapped.claim_category,
      subject_ref: mapped.subject_ref,
      object_value: mapped.object_value,
      as_of_date: mapped.as_of_date,
      confidence: mapped.confidence,
      extractor: mapped.extractor ?? "human",
      review_status: mapped.review_status,
      reviewed_at: mapped.reviewed_at ?? null,
      excerpt: mapped.excerpt ?? null,
      audits: (audits ?? []).map(auditFromDb),
    });
  }

  const claimRowsForAgg: ClaimRow[] = claims.map((c) => ({
    id: c.id,
    claim_type: c.claim_type,
    claim_category: c.claim_category,
    subject_ref: c.subject_ref,
    object_value: c.object_value,
    as_of_date: c.as_of_date,
    confidence: c.confidence,
    review_status: c.review_status,
    source_id: sourceRow.id,
    excerpt: c.excerpt ?? undefined,
    lineage_id: c.lineage_id,
    version: c.version,
    is_head: c.is_head,
    extractor: c.extractor,
    reviewed_at: c.reviewed_at ?? undefined,
  }));

  return {
    source: catalogSourceFromParts(sourceFromDb(sourceRow), claimRowsForAgg),
    claims,
  };
}
