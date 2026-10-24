import { describe, expect, it } from "vitest";
import { getCountryStatsJson } from "./data-json";

describe("getCountryStatsJson", () => {
  it("returns an empty stub (not case rollups)", () => {
    expect(getCountryStatsJson("2026-10-23")).toEqual([]);
  });
});
