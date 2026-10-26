import { z } from "zod";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HospitalizationSchema = z.object({
  id: z.uuid(),
  case_id: z.uuid(),
  admitted_at: DateSchema.nullable().optional(),
  discharged_at: DateSchema.nullable().optional(),
  facility_name: z.string().min(1).nullable().optional(),
});

export type Hospitalization = z.infer<typeof HospitalizationSchema>;
