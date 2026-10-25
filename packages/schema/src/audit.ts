import { z } from "zod";
import { CurateAuditActionSchema } from "./enums";

/** Append-only Curate audit event (Neo4j SoT; D1 may hold job copies). */
export const CurateAuditEventSchema = z.object({
  id: z.string().uuid(),
  at: z.string().datetime(),
  actor: z.string().min(1),
  action: CurateAuditActionSchema,
  lineage_id: z.string().uuid().nullable().optional(),
  claim_id: z.string().uuid().nullable().optional(),
  source_id: z.string().uuid().nullable().optional(),
  from_version: z.number().int().min(1).nullable().optional(),
  to_version: z.number().int().min(1).nullable().optional(),
  reason: z.string().nullable().optional(),
  payload_digest: z.string().nullable().optional(),
});

export type CurateAuditEvent = z.infer<typeof CurateAuditEventSchema>;
