import { z } from "zod";

export const TrackingModeSchema = z.enum(["individual", "aggregate"]);

export const AdminUnitSchema = z.object({
  id: z.string().min(1),
  iso: z.string().min(2),
  level: z.enum(["admin0", "admin1", "admin2", "admin3"]),
  name: z.string().min(1),
  tracking_mode: TrackingModeSchema.nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  parent_id: z.string().nullable().optional(),
});

export type AdminUnit = z.infer<typeof AdminUnitSchema>;
export type TrackingMode = z.infer<typeof TrackingModeSchema>;
