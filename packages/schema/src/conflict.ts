import { z } from "zod";
import { ClaimSchema } from "./claim";

/** Two approved or pending claims that disagree; both remain visible until a human resolves. */
export const ClaimConflictSchema = z.object({
  id: z.string().uuid(),
  claim_a_id: z.string().uuid(),
  claim_b_id: z.string().uuid(),
  subject_ref: z.string().min(1),
  claim_type: z.string().min(1),
  status: z.enum(["open", "resolved_a", "resolved_b", "resolved_neither"]),
  detected_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().optional(),
  resolved_by: z.string().nullable().optional(),
  resolution_note: z.string().nullable().optional(),
});

export type ClaimConflict = z.infer<typeof ClaimConflictSchema>;

export const ConflictPairViewSchema = z.object({
  conflict: ClaimConflictSchema,
  claim_a: ClaimSchema,
  claim_b: ClaimSchema,
});

export type ConflictPairView = z.infer<typeof ConflictPairViewSchema>;
