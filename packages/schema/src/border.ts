import { z } from "zod";
import { ConfidenceSchema } from "./enums";

export const BorderMeasureSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  measure_type: z.enum([
    "entry_screening",
    "temperature_check",
    "health_declaration",
    "quarantine",
    "travel_ban",
    "flight_suspension",
    "visa",
    "other",
  ]),
  status: z.enum(["active", "lifted", "scheduled", "unclear"]),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().nullable().optional(),
  audience: z
    .enum(["all_arrivals", "from_affected", "from_listed_countries", "nationals", "other"])
    .nullable()
    .optional(),
  applies_to_countries: z.array(z.string()).default([]),
  confidence: ConfidenceSchema,
  supersedes_id: z.uuid().nullable().optional(),
});

export type BorderMeasure = z.infer<typeof BorderMeasureSchema>;
