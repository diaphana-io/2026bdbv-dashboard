import { describe, expect, it } from "vitest";
import {
  getCasesJson,
  getCatalogSourcesJson,
  getConflictViewsJson,
  getInboxCandidatesJson,
  getSourceCatalogDetailJson,
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

  it("builds catalog sources and detail from seed JSON", () => {
    const sources = getCatalogSourcesJson();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.curation_status !== "candidate")).toBe(true);
    expect(sources[0].claim_count).toBeGreaterThan(0);
    expect(sources[0].extractors.length).toBeGreaterThan(0);

    const detail = getSourceCatalogDetailJson(sources[0].id);
    expect(detail).not.toBeNull();
    expect(detail!.claims.every((c) => c.lineage_id && c.version >= 1)).toBe(
      true,
    );
  });
});
