import { describe, expect, it } from "vitest";
import {
  parseCurateDataSource,
  resolveCurateDataSource,
} from "./curate-data-source";

describe("curate data source", () => {
  it("parses cookie values", () => {
    expect(parseCurateDataSource("fixture")).toBe("fixture");
    expect(parseCurateDataSource("live")).toBe("live");
    expect(parseCurateDataSource("other")).toBeNull();
  });

  it("defaults to live when Neo4j is configured", () => {
    expect(resolveCurateDataSource(null, true)).toBe("live");
    expect(resolveCurateDataSource(null, false)).toBe("fixture");
  });

  it("cookie overrides default", () => {
    expect(resolveCurateDataSource("fixture", true)).toBe("fixture");
    expect(resolveCurateDataSource("live", false)).toBe("live");
  });
});
