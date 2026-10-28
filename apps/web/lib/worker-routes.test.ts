import { describe, expect, it } from "vitest";
import {
  APP_WORKER_FETCH_PATTERNS,
  CURATE_WORKER_FETCH_PATTERNS,
  assertWorkerRouteSeparation,
} from "./worker-routes";

describe("worker route separation", () => {
  it("keeps /app and /curate on different Workers", () => {
    expect(APP_WORKER_FETCH_PATTERNS).toEqual([
      "2026bdbv.diaphana.io/app",
      "2026bdbv.diaphana.io/app/*",
    ]);
    expect(CURATE_WORKER_FETCH_PATTERNS).toEqual([
      "2026bdbv.diaphana.io/curate",
      "2026bdbv.diaphana.io/curate/*",
    ]);
    expect(() =>
      assertWorkerRouteSeparation(
        APP_WORKER_FETCH_PATTERNS,
        CURATE_WORKER_FETCH_PATTERNS,
      ),
    ).not.toThrow();
  });

  it("rejects overlapping patterns", () => {
    expect(() =>
      assertWorkerRouteSeparation(
        ["2026bdbv.diaphana.io/app", "2026bdbv.diaphana.io/curate"],
        CURATE_WORKER_FETCH_PATTERNS,
      ),
    ).toThrow(/must not own Curate/);
  });
});
