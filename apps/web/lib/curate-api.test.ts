import { describe, expect, it } from "vitest";
import { isResolveStatus, normalizeUrl } from "./curate-api";

describe("curate-api helpers", () => {
  it("accepts resolve statuses", () => {
    expect(isResolveStatus("resolved_a")).toBe(true);
    expect(isResolveStatus("resolved_b")).toBe(true);
    expect(isResolveStatus("resolved_neither")).toBe(true);
    expect(isResolveStatus("open")).toBe(false);
  });

  it("normalizes urls", () => {
    expect(normalizeUrl("HTTPS://Example.COM/Path/?q=1")).toBe(
      "https://example.com/path",
    );
  });
});
