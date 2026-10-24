import { z } from "zod";

const DateTimeOrDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.+-Z]+)?$/);

export const TravelLegSchema = z.object({
  id: z.string().uuid(),
  person_id: z.string().uuid(),
  departed_at: DateTimeOrDateSchema.nullable().optional(),
  arrived_at: DateTimeOrDateSchema.nullable().optional(),
  mode: z.enum(["air", "land", "unknown"]).default("unknown"),
  from_admin_id: z.string().min(1).nullable().optional(),
  to_admin_id: z.string().min(1).nullable().optional(),
  from_poe_id: z.string().min(1).nullable().optional(),
  to_poe_id: z.string().min(1).nullable().optional(),
});

export type TravelLeg = z.infer<typeof TravelLegSchema>;
