import { z } from "zod";

export const DatasetSchema = z.enum(["production", "test"]);
export const ClassificationSchema = z.enum([
  "suspected",
  "probable",
  "confirmed",
  "not_a_case",
]);
export const ReviewStatusSchema = z.enum([
  "pending_review",
  "approved",
  "rejected",
  "superseded",
]);
export const ConfidenceSchema = z.enum([
  "official",
  "news_corroborated",
  "news_single",
  "inferred",
]);
export const InclusionReasonSchema = z.enum([
  "lab_confirmed_bdbv",
  "probable_case_def",
  "suspected_case_def",
  "temporal_suspect",
]);
export const SourceKindSchema = z.enum([
  "official_don",
  "official_moh",
  "sitrep",
  "news",
  "travel_advisory",
  "other",
]);
/** Jev-like evidence category for a source document (classify output). */
export const EvidenceClassSchema = z.enum([
  "intl_org",
  "national_official",
  "academic",
  "news",
  "travel_advisory",
  "ngo_grey",
  "other",
]);
/** How a source relates to this outbreak (optional; distinct from confidence). */
export const EvidenceRoleSchema = z.enum([
  "primary_count",
  "corroboration",
  "background",
]);
/** Inbox / discover duplicate flag (deterministic first; possible = soft match). */
export const DuplicateLevelSchema = z.enum([
  "none",
  "exact_url",
  "content_hash",
  "possible",
]);
export const CurationStatusSchema = z.enum([
  "candidate",
  "dismissed",
  "fetched",
  "extracted",
  "in_review",
  "done",
]);
export const CurateAuditActionSchema = z.enum([
  "approve",
  "reject",
  "revise",
  "approve_revision",
  "reject_revision",
  "rollback",
  "resolve_conflict",
  "dismiss_source",
]);
