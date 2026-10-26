import { z } from "zod";
import { DatasetSchema } from "./enums";

export const PersonSchema = z.object({
  id: z.uuid(),
  visual_id: z.string().min(1),
  dataset: DatasetSchema,
  role: z.enum(["case", "contact", "contact_of_contact", "both"]),
  sex: z.enum(["male", "female", "other", "unknown"]).nullable().optional(),
  age_years: z.number().int().nonnegative().nullable().optional(),
  is_healthcare_worker: z.boolean().nullable().optional(),
  date_of_reporting: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  admin0_iso: z.string().nullable().optional(),
  admin1_id: z.string().nullable().optional(),
  admin2_id: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  geo_precision: z
    .enum(["exact", "facility", "admin_centroid", "unknown"])
    .nullable()
    .optional(),
  risk_level: z.enum(["high", "medium", "low"]).nullable().optional(),
  was_quarantined: z.boolean().nullable().optional(),
  is_synthetic: z.boolean().default(false),
});

export type Person = z.infer<typeof PersonSchema>;
