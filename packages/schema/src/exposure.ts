import { z } from "zod";

export const ExposureSchema = z.object({
  id: z.string().uuid(),
  from_person_id: z.string().uuid(),
  to_ref_id: z.string().uuid(),
  to_ref_type: z.enum(["case", "person", "event"]),
  date_of_first_contact: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_of_last_contact: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exposure_duration_hours: z.number().nullable().optional(),
  relationship: z.string().nullable().optional(),
  exposure_setting: z.enum([
    "household",
    "health_facility",
    "funeral",
    "transport",
    "community",
    "poe",
    "other",
  ]),
  intensity: z.enum(["high", "medium", "low"]),
  protective_equipment_used: z.boolean().nullable().optional(),
  direct_contact_with_body_fluids: z.boolean().nullable().optional(),
  certainty: z.enum(["confirmed", "probable", "possible"]),
});

export type Exposure = z.infer<typeof ExposureSchema>;

export const FollowUpWindowSchema = z.object({
  id: z.string().uuid(),
  person_id: z.string().uuid(),
  source_exposure_id: z.string().uuid(),
  window_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  window_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  incubation_max_days: z.number().int().positive().default(21),
  status: z.enum([
    "active",
    "completed",
    "became_case",
    "lost_to_followup",
    "transferred",
    "cancelled",
  ]),
});

export type FollowUpWindow = z.infer<typeof FollowUpWindowSchema>;
