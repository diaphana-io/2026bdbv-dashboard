import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdminUnitSchema } from "./admin-unit";
import { CaseSchema } from "./case";
import { ClaimSchema, IncidenceObjectSchema } from "./claim";
import { ClaimConflictSchema } from "./conflict";
import { claimCategoryForType } from "./enums";
import { HospitalizationSchema } from "./hospitalization";
import { TravelLegSchema } from "./travel-leg";

const curated = join(__dirname, "../../../data/seed/curated");

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
    expect(rows.some((r: { visual_id: string }) => r.visual_id === "UG-2026-SUMMARY")).toBe(
      false,
    );
    expect(rows.filter((r: { admin0_iso: string }) => r.admin0_iso === "CD")).toHaveLength(0);
  });

  it("claims and open conflict validate", () => {
    const claims = JSON.parse(readFileSync(join(curated, "claims.json"), "utf8"));
    for (const row of claims) {
      expect(() =>
        ClaimSchema.parse({
          id: row.id,
          claim_type: row.claim_type,
          claim_category: row.claim_category,
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
    expect(
      claims.every(
        (c: { claim_category?: string }) => c.claim_category === "aggregate_count",
      ),
    ).toBe(true);
    const cdSeries = claims.filter(
      (c: { subject_ref: string; claim_type: string }) =>
        c.subject_ref === "CD" && c.claim_type === "case_count",
    );
    expect(cdSeries.length).toBeGreaterThanOrEqual(2);

    const incidenceClaims = claims.filter(
      (c: { claim_type: string }) => c.claim_type === "incidence",
    );
    for (const row of incidenceClaims) {
      expect(claimCategoryForType(row.claim_type)).toBe("aggregate_count");
      const obj = IncidenceObjectSchema.parse(row.object_value);
      if (obj.grain === "day") {
        expect(obj.period_start).toBe(obj.period_end);
        expect(obj.period_start).toBe(row.as_of_date);
      }
    }
    const cdDailyReporting = incidenceClaims
      .filter(
        (c: {
          subject_ref: string;
          object_value: { grain?: string; metric_basis?: string };
        }) =>
          c.subject_ref === "CD" &&
          c.object_value?.grain === "day" &&
          c.object_value?.metric_basis === "reporting_date",
      )
      .sort((a: { as_of_date: string }, b: { as_of_date: string }) =>
        a.as_of_date.localeCompare(b.as_of_date),
      );
    expect(cdDailyReporting.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < cdDailyReporting.length; i++) {
      const prev = new Date(cdDailyReporting[i - 1].as_of_date + "T00:00:00Z");
      const curr = new Date(cdDailyReporting[i].as_of_date + "T00:00:00Z");
      expect((curr.getTime() - prev.getTime()) / 86_400_000).toBe(1);
    }

    const conflicts = JSON.parse(readFileSync(join(curated, "conflicts.json"), "utf8"));
    for (const row of conflicts) {
      expect(() => ClaimConflictSchema.parse(row)).not.toThrow();
    }
    expect(conflicts.some((c: { status: string }) => c.status === "open")).toBe(true);
  });

  it("admin units, travel legs, hospitalizations validate", () => {
    const admins = JSON.parse(readFileSync(join(curated, "admin_units.json"), "utf8"));
    for (const row of admins) {
      expect(() => AdminUnitSchema.parse(row)).not.toThrow();
    }
    const byIso = Object.fromEntries(admins.map((a: { iso: string }) => [a.iso, a]));
    expect(byIso.KE.tracking_mode).toBe("individual");
    expect(byIso.UG.tracking_mode).toBe("individual");
    expect(byIso.NG.tracking_mode).toBe("individual");
    expect(byIso.CD.tracking_mode).toBe("aggregate");

    const legs = JSON.parse(readFileSync(join(curated, "travel_legs.json"), "utf8"));
    for (const row of legs) {
      expect(() => TravelLegSchema.parse(row)).not.toThrow();
    }
    const hosps = JSON.parse(readFileSync(join(curated, "hospitalizations.json"), "utf8"));
    for (const row of hosps) {
      expect(() => HospitalizationSchema.parse(row)).not.toThrow();
    }
  });
});
