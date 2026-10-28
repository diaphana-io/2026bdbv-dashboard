import { describe, expect, it } from "vitest";
import {
  curateApiPath,
  curateHref,
  getAccessSurface,
  shouldStripCurateFromApp,
} from "./curate-surface";

describe("getAccessSurface", () => {
  it("defaults to app", () => {
    expect(getAccessSurface({})).toBe("app");
  });

  it("detects curate via CURATE_SURFACE or APP_BASE_PATH", () => {
    expect(getAccessSurface({ CURATE_SURFACE: "1" })).toBe("curate");
    expect(getAccessSurface({ APP_BASE_PATH: "/curate" })).toBe("curate");
    expect(getAccessSurface({ NEXT_PUBLIC_CURATE_SURFACE: "1" })).toBe(
      "curate",
    );
  });
});

describe("curateHref / curateApiPath", () => {
  const app = { APP_BASE_PATH: "/app" };
  const curate = { CURATE_SURFACE: "1", APP_BASE_PATH: "/curate" };

  it("uses nested /curate paths on app surface", () => {
    expect(curateHref("", app)).toBe("/curate");
    expect(curateHref("inbox", app)).toBe("/curate/inbox");
    expect(curateApiPath("adopt-source", app)).toBe("/api/curate/adopt-source");
  });

  it("uses remounted paths on curate surface", () => {
    expect(curateHref("", curate)).toBe("/");
    expect(curateHref("inbox", curate)).toBe("/inbox");
    expect(curateApiPath("adopt-source", curate)).toBe("/api/adopt-source");
  });
});

describe("shouldStripCurateFromApp", () => {
  it("strips on deployed app Worker", () => {
    expect(
      shouldStripCurateFromApp({ APP_ENV: "production", APP_BASE_PATH: "/app" }),
    ).toBe(true);
    expect(
      shouldStripCurateFromApp({ APP_ENV: "staging", APP_BASE_PATH: "/app" }),
    ).toBe(true);
  });

  it("keeps local app unless forced", () => {
    expect(
      shouldStripCurateFromApp({
        APP_ENV: "development",
        APP_BASE_PATH: "/app",
      }),
    ).toBe(false);
    expect(
      shouldStripCurateFromApp({
        APP_ENV: "development",
        STRIP_CURATE_FROM_APP: "1",
      }),
    ).toBe(true);
  });

  it("never strips on curate surface", () => {
    expect(
      shouldStripCurateFromApp({
        APP_ENV: "production",
        CURATE_SURFACE: "1",
        APP_BASE_PATH: "/curate",
      }),
    ).toBe(false);
  });
});
