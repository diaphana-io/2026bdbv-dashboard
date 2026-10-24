import { z } from "zod";
import {
  ClassificationSchema,
  ConfidenceSchema,
  DatasetSchema,
  InclusionReasonSchema,
} from "./enums";

export const CaseSchema = z.object({
  id: z.string().uuid(),
  visual_id: z.string().min(1),
  dataset: DatasetSchema,
  classification: ClassificationSchema,
  classification_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_of_onset: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_of_reporting: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  outcome: z.enum(["alive", "recovered", "deceased", "unknown"]).nullable().optional(),
  pathogen_identified: z.boolean(),
  virus_species: z.enum(["BDBV", "unknown", "other"]),
  identification_status: z.string(),
  in_outbreak_window: z.boolean(),
  inclusion_reason: InclusionReasonSchema,
  admin0_iso: z.enum(["NG", "KE", "UG", "CD", "XX"]).or(z.string()),
  confidence: ConfidenceSchema,
  is_synthetic: z.boolean().default(false),
});

export type Case = z.infer<typeof CaseSchema>;
