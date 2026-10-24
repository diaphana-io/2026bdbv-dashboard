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
export const CurationStatusSchema = z.enum([
  "candidate",
  "dismissed",
  "fetched",
  "extracted",
  "in_review",
  "done",
]);
