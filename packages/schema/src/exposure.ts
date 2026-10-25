import { z } from "zod";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Exposure between a contact (from_person) and a case / person / event.
 *
 * Contact possibility is an **interval**, not a single day:
 * - `date_of_first_contact` — day contact possibility **began**
 * - `date_of_last_contact` — day contact possibility **ended**
 *
 * Single-day exposure: set both to the same date.
 * Follow-up windows start from `date_of_last_contact` when
 * Outbreak.followup_starts_on_last_contact is true (not from first).
 */
export const ExposureSchema = z
  .object({
    id: z.string().uuid(),
    from_person_id: z.string().uuid(),
    to_ref_id: z.string().uuid(),
    to_ref_type: z.enum(["case", "person", "event"]),
    /** Day contact possibility began (inclusive). */
    date_of_first_contact: DateSchema,
    /** Day contact possibility ended (inclusive). Drives follow-up start. */
    date_of_last_contact: DateSchema,
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
  })
  .refine(
    (e) => e.date_of_first_contact <= e.date_of_last_contact,
    {
      message: "date_of_first_contact must be on or before date_of_last_contact",
      path: ["date_of_first_contact"],
    },
  );

export type Exposure = z.infer<typeof ExposureSchema>;

export const FollowUpWindowSchema = z.object({
  id: z.string().uuid(),
  person_id: z.string().uuid(),
  source_exposure_id: z.string().uuid(),
  /** Typically = exposure date_of_last_contact (possibility ended). */
  window_start: DateSchema,
  /** Typically window_start + incubation_max_days. */
  window_end: DateSchema,
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
