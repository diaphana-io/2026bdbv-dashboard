import { describe, expect, it } from "vitest";
import {
  getAggregateAdminUnitsJson,
  getCaseDetailJson,
  getMapSnapshotGraphJson,
  getMapSnapshotJson,
} from "./data-json";
import type { ClaimRow } from "./data-types";
import {
  composeMapSnapshot,
  joinCaseCountClaimsToAdminUnits,
} from "./map-snapshot";

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

  it("graph JSON has no Claim-derived aggregates", () => {
    const graph = getMapSnapshotGraphJson("2026-10-23");
    expect(graph.cases.length).toBeGreaterThan(0);
    expect(graph).not.toHaveProperty("aggregates");
  });
});

describe("joinCaseCountClaimsToAdminUnits", () => {
  it("joins D1 case_count claims to AdminUnit lat/lon by subject_ref", () => {
    const units = getAggregateAdminUnitsJson();
    expect(units.some((u) => u.iso === "CD")).toBe(true);

    const claims: ClaimRow[] = [
      {
        id: "c-cd",
        claim_type: "case_count",
        subject_ref: "CD",
        object_value: { confirmed: 99, deaths: 4 },
        as_of_date: "2026-10-20",
        confidence: "official",
        review_status: "approved",
        source_id: "s1",
      },
      {
        id: "c-missing",
        claim_type: "case_count",
        subject_ref: "ZZ",
        object_value: { confirmed: 1, deaths: 0 },
        as_of_date: "2026-10-20",
        confidence: "official",
        review_status: "approved",
        source_id: "s1",
      },
    ];

    const aggregates = joinCaseCountClaimsToAdminUnits(claims, units);
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0]).toMatchObject({
      admin_iso: "CD",
      confirmed: 99,
      deaths: 4,
      as_of_date: "2026-10-20",
    });
    expect(aggregates[0].lat).toEqual(expect.any(Number));
    expect(aggregates[0].lon).toEqual(expect.any(Number));

    const snap = composeMapSnapshot(
      "2026-10-20",
      aggregates,
      getMapSnapshotGraphJson("2026-10-20"),
    );
    expect(snap.asOf).toBe("2026-10-20");
    expect(snap.aggregates).toEqual(aggregates);
    expect(snap.cases.length).toBeGreaterThan(0);
  });
});
