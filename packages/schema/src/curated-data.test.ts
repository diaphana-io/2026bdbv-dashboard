import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CaseSchema } from "./case";
import { ClaimSchema } from "./claim";
import { ClaimConflictSchema } from "./conflict";

const curated = join(__dirname, "../../../data/curated");

describe("curated production data", () => {
  it("cases validate", () => {
    const rows = JSON.parse(readFileSync(join(curated, "cases.json"), "utf8"));
    for (const row of rows) {
      expect(() =>
        CaseSchema.parse({
          id: row.id,
          visual_id: row.visual_id,
          dataset: row.dataset,
          classification: row.classification,
          pathogen_identified: row.pathogen_identified,
          virus_species: row.virus_species,
          identification_status: row.identification_status,
          in_outbreak_window: row.in_outbreak_window,
          inclusion_reason: row.inclusion_reason,
          admin0_iso: row.admin0_iso,
          confidence: row.confidence,
          is_synthetic: row.is_synthetic,
        }),
      ).not.toThrow();
    }
  });

  it("claims and open conflict validate", () => {
    const claims = JSON.parse(readFileSync(join(curated, "claims.json"), "utf8"));
    for (const row of claims) {
      expect(() =>
        ClaimSchema.parse({
          id: row.id,
          claim_type: row.claim_type,
          subject_ref: row.subject_ref,
          object_value: row.object_value,
          as_of_date: row.as_of_date,
          claim_fingerprint: row.claim_fingerprint,
          confidence: row.confidence,
          extractor: row.extractor,
          review_status: row.review_status,
        }),
      ).not.toThrow();
    }
    const conflicts = JSON.parse(readFileSync(join(curated, "conflicts.json"), "utf8"));
    for (const row of conflicts) {
      expect(() => ClaimConflictSchema.parse(row)).not.toThrow();
    }
    expect(conflicts.some((c: { status: string }) => c.status === "open")).toBe(true);
  });
});
