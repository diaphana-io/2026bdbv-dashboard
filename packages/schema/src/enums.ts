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
/**
 * Coarse claim bucket for Neo4j filter / Map / conflict scope.
 * Fine grain stays on `claim_type` (e.g. case_count vs death_count).
 */
export const ClaimCategorySchema = z.enum([
  "aggregate_count",
  "case_detail",
  "exposure_contact",
  "border_measure",
  "outbreak_status",
  "other",
]);
export type ClaimCategory = z.infer<typeof ClaimCategorySchema>;

/** Default category from a free-form claim_type string. */
export function claimCategoryForType(claimType: string): ClaimCategory {
  switch (claimType) {
    case "case_count":
    case "death_count":
    case "contact_count":
    case "hospitalization_count":
      return "aggregate_count";
    case "case_travel":
    case "case_lab":
    case "case_outcome":
    case "case_identity":
      return "case_detail";
    case "exposure":
    case "contact_followup":
      return "exposure_contact";
    case "border_measure":
    case "travel_advisory":
      return "border_measure";
    case "outbreak_declared":
    case "outbreak_ended":
    case "pheic":
      return "outbreak_status";
    default:
      return "other";
  }
}
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
