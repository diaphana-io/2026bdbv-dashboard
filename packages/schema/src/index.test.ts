import { describe, expect, it } from "vitest";
import { CaseSchema } from "./case";
import { ClaimSchema } from "./claim";
import { SourceDocumentSchema } from "./source";

describe("schema smoke", () => {
  it("parses a confirmed BDBV case", () => {
    const c = CaseSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      visual_id: "KE-2026-001",
      dataset: "production",
      classification: "confirmed",
      pathogen_identified: true,
      virus_species: "BDBV",
      identification_status: "lab_confirmed",
      in_outbreak_window: true,
      inclusion_reason: "lab_confirmed_bdbv",
      admin0_iso: "KE",
      confidence: "official",
      is_synthetic: false,
    });
    expect(c.visual_id).toBe("KE-2026-001");
  });

  it("requires claim fingerprint", () => {
    expect(() =>
      ClaimSchema.parse({
        id: "22222222-2222-2222-2222-222222222222",
        claim_type: "case_count",
        subject_ref: "KE",
        object_value: { confirmed: 9 },
        as_of_date: "2026-10-20",
        confidence: "official",
        extractor: "human",
        review_status: "approved",
      }),
    ).toThrow();
  });

  it("parses source document", () => {
    const s = SourceDocumentSchema.parse({
      id: "33333333-3333-3333-3333-333333333333",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622",
      normalized_url:
        "https://www.who.int/emergencies/disease-outbreak-news/item/2026-don622",
      kind: "official_don",
      curation_status: "done",
    });
    expect(s.kind).toBe("official_don");
  });
});
