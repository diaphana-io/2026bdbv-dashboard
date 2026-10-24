import { describe, expect, it } from "vitest";
import { getCaseDetailJson, getMapSnapshotJson } from "./data-json";

describe("map snapshot JSON", () => {
  it("returns CD aggregate and individual cases by asOf", () => {
    const early = getMapSnapshotJson("2026-07-01");
    expect(early.aggregates.some((a) => a.admin_iso === "CD")).toBe(true);
    const cd = early.aggregates.find((a) => a.admin_iso === "CD")!;
    expect(cd.confirmed).toBe(48);

    const late = getMapSnapshotJson("2026-10-23");
    const cdLate = late.aggregates.find((a) => a.admin_iso === "CD")!;
    expect(cdLate.confirmed).toBe(146);
    expect(late.cases.length).toBeGreaterThan(0);
    expect(late.travels.length).toBeGreaterThan(0);
  });

  it("builds case detail events", () => {
    const detail = getCaseDetailJson("cccccccc-0000-4000-8000-000000000001");
    expect(detail?.visual_id).toBe("KE-2026-001");
    expect(detail?.events.some((e) => e.kind === "travel")).toBe(true);
    expect(detail?.events.some((e) => e.kind === "hospitalization")).toBe(true);
  });
});
