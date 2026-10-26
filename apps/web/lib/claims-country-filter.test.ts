import { describe, expect, it } from "vitest";
import { filterAggregatesForCountries } from "./claims-country-filter";
import type { MapAggregate } from "./data-types";

function agg(
  admin_iso: string,
  confirmed = 1,
  deaths = 0,
): MapAggregate {
  return {
    admin_iso,
    name: admin_iso,
    lat: 0,
    lon: 0,
    confirmed,
    deaths,
    as_of_date: "2025-01-01",
  };
}

describe("filterAggregatesForCountries", () => {
  const rows = [
    agg("CD", 10, 2),
    agg("CD10", 3, 0),
    agg("KE", 5, 1),
    agg("UG", 2, 0),
  ];

  it("returns empty when no countries enabled", () => {
    expect(filterAggregatesForCountries(rows, [])).toEqual([]);
  });

  it("keeps country total and subnational pcodes for CD", () => {
    const out = filterAggregatesForCountries(rows, ["CD"]);
    expect(out.map((a) => a.admin_iso).sort()).toEqual(["CD", "CD10"]);
  });

  it("filters to multiple enabled countries", () => {
    const out = filterAggregatesForCountries(rows, ["KE", "UG"]);
    expect(out.map((a) => a.admin_iso).sort()).toEqual(["KE", "UG"]);
  });
});
