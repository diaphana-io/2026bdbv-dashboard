import { z } from "zod";
import {
  ClaimCategorySchema,
  claimCategoryForType,
  ConfidenceSchema,
  ReviewStatusSchema,
} from "./enums";

export const ReviewPolicySchema = z.object({
  min_approvers: z.number().int().min(1).default(1),
});

export const ClaimSchema = z
  .object({
  id: z.string().uuid(),
  claim_type: z.string().min(1),
  /** Coarse bucket; persisted on Neo4j Claim nodes. Defaults from claim_type. */
  claim_category: ClaimCategorySchema.optional(),
  subject_ref: z.string().min(1),
  object_value: z.unknown(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claim_fingerprint: z.string().min(1),
  duplicate_of_id: z.string().uuid().nullable().optional(),
  /** Stable logical claim chain; Map tracks the approved head of this lineage. */
  lineage_id: z.string().uuid().optional(),
  /** Immutable version within lineage (1..N). */
  version: z.number().int().min(1).optional().default(1),
  is_head: z.boolean().optional(),
  needs_revision: z.boolean().optional(),
  confidence: ConfidenceSchema,
  /** Extract/classify suggestion only — human sets `confidence` on approve. */
  suggested_confidence: ConfidenceSchema.nullable().optional(),
  excerpt: z.string().nullable().optional(),
  excerpt_char_start: z.number().int().nullable().optional(),
  excerpt_char_end: z.number().int().nullable().optional(),
  extractor: z.enum(["assisted", "human"]),
  review_status: ReviewStatusSchema,
  review_policy: ReviewPolicySchema.optional(),
  reviewed_at: z.string().datetime().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
})
  .transform((c) => ({
    ...c,
    claim_category: c.claim_category ?? claimCategoryForType(c.claim_type),
  }));

export type Claim = z.infer<typeof ClaimSchema>;
export type ReviewPolicy = z.infer<typeof ReviewPolicySchema>;
