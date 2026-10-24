import { z } from "zod";
import { ConfidenceSchema, ReviewStatusSchema } from "./enums";

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
