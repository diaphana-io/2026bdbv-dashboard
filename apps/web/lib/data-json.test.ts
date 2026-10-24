import { describe, expect, it } from "vitest";
import {
  getCasesJson,
  getConflictViewsJson,
  getInboxCandidatesJson,
  overviewKpisJson,
} from "./data-json";

describe("data-json facade", () => {
  it("returns production cases and open conflicts", () => {
    const cases = getCasesJson({ includeTemporalSuspects: true });
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every((c) => c.dataset === "production")).toBe(true);

    const conflicts = getConflictViewsJson();
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.every((c) => c.conflict.status === "open")).toBe(true);
    expect(conflicts[0].claim_a.id).toBeTruthy();
  });

  it("computes overview KPIs from curated JSON", () => {
    const k = overviewKpisJson();
    expect(k.confirmed).toBeGreaterThan(0);
    expect(k.asOf).toBe("2026-10-23");
    expect(getInboxCandidatesJson().every((i) => i.curation_status === "candidate")).toBe(
      true,
    );
  });
});
