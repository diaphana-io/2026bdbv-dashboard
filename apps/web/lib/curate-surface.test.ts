import { describe, expect, it } from "vitest";
import { curatePublicUrl, shouldStripCurateFromApp } from "./curate-surface";

describe("curatePublicUrl", () => {
  it("points at the private Curate Worker origin", () => {
    expect(curatePublicUrl()).toBe("https://2026bdbv.diaphana.io/curate");
    expect(curatePublicUrl("inbox")).toBe(
      "https://2026bdbv.diaphana.io/curate/inbox",
    );
  });
});

describe("shouldStripCurateFromApp", () => {
  it("strips on deployed Map Worker", () => {
    expect(shouldStripCurateFromApp({ APP_ENV: "production" })).toBe(true);
    expect(shouldStripCurateFromApp({ APP_ENV: "staging" })).toBe(true);
  });

  it("keeps local app unless forced", () => {
    expect(shouldStripCurateFromApp({ APP_ENV: "development" })).toBe(false);
    expect(
      shouldStripCurateFromApp({
        APP_ENV: "development",
        STRIP_CURATE_FROM_APP: "1",
      }),
    ).toBe(true);
  });

  it("honors explicit STRIP_CURATE_FROM_APP=0", () => {
    expect(
      shouldStripCurateFromApp({
        APP_ENV: "production",
        STRIP_CURATE_FROM_APP: "0",
      }),
    ).toBe(false);
  });
});
