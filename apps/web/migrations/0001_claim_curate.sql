-- Claim Curate SoT (Phase 1): tabular Curate artifacts on D1.
-- Aligns with packages/schema SourceDocument / Claim / ClaimConflict /
-- CurateAuditEvent + curated claim source_id (ClaimSchema-adjacent FROM).
-- Case graph entities remain on Neo4j.

PRAGMA foreign_keys = ON;

CREATE TABLE sources (
  id TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  canonical_id TEXT,
  title TEXT,
  publisher TEXT,
  kind TEXT NOT NULL,
  evidence_class TEXT NOT NULL DEFAULT 'other',
  evidence_role TEXT,
  duplicate_level TEXT NOT NULL DEFAULT 'none',
  duplicate_of_source_id TEXT REFERENCES sources (id) ON DELETE SET NULL,
  published_at TEXT,
  retrieved_at TEXT,
  discovered_at TEXT,
  discovery_run_id TEXT,
  discovery_query TEXT,
  language TEXT,
  r2_snapshot_key TEXT,
  content_hash TEXT,
  curation_status TEXT NOT NULL
);

CREATE UNIQUE INDEX sources_normalized_url_uidx ON sources (normalized_url);

CREATE TABLE claims (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources (id) ON DELETE RESTRICT,
  claim_type TEXT NOT NULL,
  claim_category TEXT,
  subject_ref TEXT NOT NULL,
  object_value TEXT NOT NULL,
  as_of_date TEXT NOT NULL,
  claim_fingerprint TEXT NOT NULL,
  duplicate_of_id TEXT REFERENCES claims (id) ON DELETE SET NULL,
  lineage_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_head INTEGER,
  needs_revision INTEGER,
  confidence TEXT NOT NULL,
  suggested_confidence TEXT,
  excerpt TEXT,
  excerpt_char_start INTEGER,
  excerpt_char_end INTEGER,
  extractor TEXT NOT NULL,
  review_status TEXT NOT NULL,
  review_policy TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX claims_claim_fingerprint_idx ON claims (claim_fingerprint);
CREATE INDEX claims_lineage_id_idx ON claims (lineage_id);
CREATE INDEX claims_as_of_date_idx ON claims (as_of_date);
CREATE INDEX claims_source_id_idx ON claims (source_id);
CREATE INDEX claims_review_map_idx ON claims (review_status, claim_type, subject_ref);

CREATE TABLE claim_conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  claim_a_id TEXT NOT NULL REFERENCES claims (id) ON DELETE RESTRICT,
  claim_b_id TEXT NOT NULL REFERENCES claims (id) ON DELETE RESTRICT,
  subject_ref TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  status TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_note TEXT
);

CREATE INDEX claim_conflicts_status_idx ON claim_conflicts (status);

CREATE TABLE curate_audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  lineage_id TEXT,
  claim_id TEXT,
  source_id TEXT,
  from_version INTEGER,
  to_version INTEGER,
  reason TEXT,
  payload_digest TEXT
);

-- Dismissed inbox URLs (Neo4j DismissedSource: normalized_url + dismissed_at).
CREATE TABLE dismissed_sources (
  normalized_url TEXT PRIMARY KEY NOT NULL,
  dismissed_at TEXT NOT NULL
);
