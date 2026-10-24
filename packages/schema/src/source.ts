import { z } from "zod";
import { CurationStatusSchema, SourceKindSchema } from "./enums";

export const SourceDocumentSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  normalized_url: z.string().min(1),
  canonical_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  kind: SourceKindSchema,
  published_at: z.string().datetime().nullable().optional(),
  retrieved_at: z.string().datetime().nullable().optional(),
  discovered_at: z.string().datetime().nullable().optional(),
  discovery_run_id: z.string().uuid().nullable().optional(),
  discovery_query: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  r2_snapshot_key: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  curation_status: CurationStatusSchema,
});

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
