import { describe, expect, it } from "vitest";
import { getIncidenceSeriesJson } from "./data-json";

describe("getIncidenceSeriesJson", () => {
  it("returns ordered CD daily reporting_date buckets", () => {
    const series = getIncidenceSeriesJson({ country: "CD" });
    expect(series.length).toBeGreaterThanOrEqual(5);
    expect(series.every((r) => r.subject_ref === "CD")).toBe(true);
    expect(series.every((r) => r.metric_basis === "reporting_date")).toBe(true);
    expect(series.every((r) => r.grain === "day")).toBe(true);
    for (let i = 1; i < series.length; i++) {
      expect(
        series[i - 1].period_start.localeCompare(series[i].period_start),
      ).toBeLessThanOrEqual(0);
    }
    expect(series.map((r) => r.period_start)).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
  });

  it("applies asOf cutoff", () => {
    const cut = getIncidenceSeriesJson({ country: "CD", asOf: "2026-10-18" });
    expect(cut.map((r) => r.as_of_date)).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(cut.every((r) => r.as_of_date <= "2026-10-18")).toBe(true);
  });
});
