import { describe, expect, it } from "vitest";
import { CurateAuditEventSchema } from "./audit";
import { CaseSchema } from "./case";
import { ClaimSchema } from "./claim";
import {
  DuplicateLevelSchema,
  EvidenceClassSchema,
} from "./enums";
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

  it("parses claim lineage and version hooks", () => {
    const c = ClaimSchema.parse({
      id: "22222222-2222-2222-2222-222222222222",
      lineage_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      version: 2,
      is_head: false,
      needs_revision: true,
      claim_type: "case_count",
      subject_ref: "KE",
      object_value: { confirmed: 9 },
      as_of_date: "2026-10-20",
      claim_fingerprint: "fp",
      confidence: "official",
      extractor: "human",
      review_status: "pending_review",
    });
    expect(c.lineage_id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(c.version).toBe(2);
    expect(c.needs_revision).toBe(true);
  });

  it("parses source document with evidence and duplicate defaults", () => {
    const s = SourceDocumentSchema.parse({
      id: "33333333-3333-3333-3333-333333333333",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622",
      normalized_url:
        "https://www.who.int/emergencies/disease-outbreak-news/item/2026-don622",
      kind: "official_don",
      curation_status: "done",
    });
    expect(s.kind).toBe("official_don");
    expect(s.evidence_class).toBe("other");
    expect(s.duplicate_level).toBe("none");
  });

  it("parses source evidence_class and duplicate_level", () => {
    expect(EvidenceClassSchema.parse("intl_org")).toBe("intl_org");
    expect(DuplicateLevelSchema.parse("exact_url")).toBe("exact_url");
    const s = SourceDocumentSchema.parse({
      id: "33333333-3333-3333-3333-333333333334",
      url: "https://example.com/a",
      normalized_url: "https://example.com/a",
      kind: "news",
      evidence_class: "news",
      curation_status: "candidate",
      duplicate_level: "content_hash",
      duplicate_of_source_id: "33333333-3333-3333-3333-333333333333",
    });
    expect(s.duplicate_of_source_id).toBe(
      "33333333-3333-3333-3333-333333333333",
    );
  });

  it("parses curate audit event", () => {
    const e = CurateAuditEventSchema.parse({
      id: "44444444-4444-4444-4444-444444444444",
      at: "2026-10-24T12:00:00.000Z",
      actor: "curator@example.com",
      action: "revise",
      lineage_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      claim_id: "22222222-2222-2222-2222-222222222222",
      from_version: 1,
      to_version: 2,
      reason: "official correction",
      payload_digest: "abc",
    });
    expect(e.action).toBe("revise");
  });
});
