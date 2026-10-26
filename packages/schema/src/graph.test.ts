import { describe, expect, it } from "vitest";
import { AdminUnitSchema } from "./admin-unit";
import { ConflictPairViewSchema } from "./conflict";
import { ExposureSchema, FollowUpWindowSchema } from "./exposure";
import { HospitalizationSchema } from "./hospitalization";
import { PersonSchema } from "./person";
import { TravelLegSchema } from "./travel-leg";

describe("graph-related schemas", () => {
  it("parses exposure and follow-up window", () => {
    const exp = ExposureSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      from_person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      to_ref_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      to_ref_type: "case",
      date_of_first_contact: "2026-10-03",
      date_of_last_contact: "2026-10-05",
      exposure_setting: "household",
      intensity: "high",
      certainty: "confirmed",
    });
    const w = FollowUpWindowSchema.parse({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      person_id: exp.from_person_id,
      source_exposure_id: exp.id,
      window_start: "2026-10-05",
      window_end: "2026-10-26",
      incubation_max_days: 21,
      status: "active",
    });
    expect(w.status).toBe("active");
    expect(exp.date_of_first_contact).toBe("2026-10-03");
  });

  it("rejects exposure when first contact is after last", () => {
    expect(() =>
      ExposureSchema.parse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        from_person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        to_ref_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        to_ref_type: "case",
        date_of_first_contact: "2026-10-06",
        date_of_last_contact: "2026-10-05",
        exposure_setting: "household",
        intensity: "high",
        certainty: "confirmed",
      }),
    ).toThrow();
  });

  it("conflict pair keeps both claims visible", () => {
    const claim = {
      id: "11111111-1111-4111-8111-111111111111",
      claim_type: "case_count",
      subject_ref: "KE",
      object_value: { confirmed: 9 },
      as_of_date: "2026-10-20",
      claim_fingerprint: "fp-a",
      confidence: "official" as const,
      extractor: "human" as const,
      review_status: "approved" as const,
    };
    const claimB = {
      ...claim,
      id: "22222222-2222-4222-8222-222222222222",
      object_value: { confirmed: 11 },
      claim_fingerprint: "fp-b",
      confidence: "news_single" as const,
    };
    const view = ConflictPairViewSchema.parse({
      conflict: {
        id: "33333333-3333-4333-8333-333333333333",
        claim_a_id: claim.id,
        claim_b_id: claimB.id,
        subject_ref: "KE",
        claim_type: "case_count",
        status: "open",
        detected_at: "2026-10-21T00:00:00.000Z",
      },
      claim_a: claim,
      claim_b: claimB,
    });
    expect(view.conflict.status).toBe("open");
    expect(view.claim_a.object_value).not.toEqual(view.claim_b.object_value);
  });

  it("parses contact person", () => {
    const p = PersonSchema.parse({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      visual_id: "KE-C-001",
      dataset: "production",
      role: "contact",
      admin0_iso: "KE",
      risk_level: "high",
      is_synthetic: false,
    });
    expect(p.role).toBe("contact");
  });

  it("parses admin unit tracking modes, travel leg, hospitalization", () => {
    const ke = AdminUnitSchema.parse({
      id: "admin0-KE",
      iso: "KE",
      level: "admin0",
      name: "Kenya",
      tracking_mode: "individual",
      lat: -1.2921,
      lon: 36.8219,
    });
    const cd = AdminUnitSchema.parse({
      id: "admin0-CD",
      iso: "CD",
      level: "admin0",
      name: "Democratic Republic of the Congo",
      tracking_mode: "aggregate",
      lat: 0.515,
      lon: 29.291,
    });
    expect(ke.tracking_mode).toBe("individual");
    expect(cd.tracking_mode).toBe("aggregate");

    const leg = TravelLegSchema.parse({
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      departed_at: "2026-09-28",
      arrived_at: "2026-09-29",
      mode: "air",
      from_admin_id: "admin0-CD",
      to_admin_id: "admin0-KE",
    });
    expect(leg.mode).toBe("air");

    const hosp = HospitalizationSchema.parse({
      id: "99999999-9999-4999-8999-999999999999",
      case_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      admitted_at: "2026-10-03",
      discharged_at: "2026-10-05",
      facility_name: "Kenyatta National Hospital",
    });
    expect(hosp.facility_name).toContain("Kenyatta");
  });
});
