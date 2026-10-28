import { describe, expect, it } from "vitest";
import { isAccessEnforced, isAccessProtectedPath } from "./access";

describe("isAccessProtectedPath (app surface — base /app)", () => {
  it("protects nested curate UI and API", () => {
    expect(isAccessProtectedPath("/curate", "app")).toBe(true);
    expect(isAccessProtectedPath("/curate/overview", "app")).toBe(true);
    expect(isAccessProtectedPath("/curate/inbox", "app")).toBe(true);
    expect(isAccessProtectedPath("/curate/review", "app")).toBe(true);
    expect(isAccessProtectedPath("/api/curate/resolve-conflict", "app")).toBe(
      true,
    );
    expect(isAccessProtectedPath("/api/curate", "app")).toBe(true);
  });

  it("leaves public dashboard routes open", () => {
    expect(isAccessProtectedPath("/", "app")).toBe(false);
    expect(isAccessProtectedPath("/cases", "app")).toBe(false);
    expect(isAccessProtectedPath("/api/hello", "app")).toBe(false);
    expect(isAccessProtectedPath("/api/map/case", "app")).toBe(false);
    expect(isAccessProtectedPath("/curators", "app")).toBe(false);
  });
});

describe("isAccessProtectedPath (curate surface — base /curate)", () => {
  it("protects remounted UI roots after basePath strip", () => {
    expect(isAccessProtectedPath("/", "curate")).toBe(true);
    expect(isAccessProtectedPath("/inbox", "curate")).toBe(true);
    expect(isAccessProtectedPath("/overview", "curate")).toBe(true);
    expect(isAccessProtectedPath("/catalog", "curate")).toBe(true);
    expect(isAccessProtectedPath("/extract", "curate")).toBe(true);
    expect(isAccessProtectedPath("/review", "curate")).toBe(true);
    expect(isAccessProtectedPath("/conflicts", "curate")).toBe(true);
    expect(isAccessProtectedPath("/status", "curate")).toBe(true);
    expect(isAccessProtectedPath("/source", "curate")).toBe(true);
    expect(isAccessProtectedPath("/cases", "curate")).toBe(true);
    expect(isAccessProtectedPath("/cases/extract", "curate")).toBe(true);
  });

  it("protects remounted API paths after basePath strip", () => {
    expect(isAccessProtectedPath("/api/adopt-source", "curate")).toBe(true);
    expect(isAccessProtectedPath("/api/submit-source", "curate")).toBe(true);
    expect(isAccessProtectedPath("/api/review-claim", "curate")).toBe(true);
    expect(isAccessProtectedPath("/api/resolve-conflict", "curate")).toBe(true);
    expect(isAccessProtectedPath("/api/rollback-claim", "curate")).toBe(true);
    expect(isAccessProtectedPath("/api/pipeline-status", "curate")).toBe(true);
  });
});

describe("isAccessEnforced", () => {
  it("requires both team domain and audience", () => {
    expect(isAccessEnforced({})).toBe(false);
    expect(isAccessEnforced({ teamDomain: "team.cloudflareaccess.com" })).toBe(
      false,
    );
    expect(isAccessEnforced({ audience: "aud" })).toBe(false);
    expect(
      isAccessEnforced({
        teamDomain: "team.cloudflareaccess.com",
        audience: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe(true);
  });
});
