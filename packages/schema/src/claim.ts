import { z } from "zod";
import { ConfidenceSchema, ReviewStatusSchema } from "./enums";

/**
 * Known claim_type values (docs / validation helpers).
 * ClaimSchema.claim_type stays z.string().min(1) for forward-compat.
 */
export const ClaimTypeSchema = z.enum([
  "case_count",
  "death_count",
  "contact_count",
  "hospitalization_count",
  "incidence",
  "case_travel",
  "case_lab",
  "case_outcome",
  "case_identity",
  "exposure",
  "contact_followup",
  "border_measure",
  "travel_advisory",
  "outbreak_declared",
  "outbreak_ended",
  "pheic",
]);

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Period new-count payload for claim_type "incidence". */
export const IncidenceObjectSchema = z
  .object({
    period_start: IsoDateSchema,
    period_end: IsoDateSchema,
    grain: z.enum(["day", "week"]),
    new_confirmed: z.number().int().min(0),
    new_deaths: z.number().int().min(0).optional(),
    metric_basis: z.enum(["reporting_date", "onset_date"]),
  })
  .refine((o) => o.grain !== "day" || o.period_start === o.period_end, {
    message: "day grain requires period_start === period_end",
  });

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  claim_type: z.string().min(1),
  subject_ref: z.string().min(1),
  object_value: z.unknown(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claim_fingerprint: z.string().min(1),
  duplicate_of_id: z.string().uuid().nullable().optional(),
  confidence: ConfidenceSchema,
  excerpt: z.string().nullable().optional(),
  excerpt_char_start: z.number().int().nullable().optional(),
  excerpt_char_end: z.number().int().nullable().optional(),
  extractor: z.enum(["assisted", "human"]),
  review_status: ReviewStatusSchema,
  reviewed_at: z.string().datetime().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimType = z.infer<typeof ClaimTypeSchema>;
export type IncidenceObject = z.infer<typeof IncidenceObjectSchema>;
