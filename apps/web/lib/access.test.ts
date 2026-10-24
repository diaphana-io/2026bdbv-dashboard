import { describe, expect, it } from "vitest";
import { isAccessEnforced, isAccessProtectedPath } from "./access";

describe("isAccessProtectedPath", () => {
  it("protects curate UI and API", () => {
    expect(isAccessProtectedPath("/curate")).toBe(true);
    expect(isAccessProtectedPath("/curate/review")).toBe(true);
    expect(isAccessProtectedPath("/api/curate/resolve-conflict")).toBe(true);
    expect(isAccessProtectedPath("/api/curate")).toBe(true);
  });

  it("leaves public dashboard routes open", () => {
    expect(isAccessProtectedPath("/")).toBe(false);
    expect(isAccessProtectedPath("/cases")).toBe(false);
    expect(isAccessProtectedPath("/api/hello")).toBe(false);
    expect(isAccessProtectedPath("/curators")).toBe(false);
  });
});

describe("isAccessEnforced", () => {
  it("requires both team domain and audience", () => {
    expect(isAccessEnforced({})).toBe(false);
    expect(isAccessEnforced({ teamDomain: "team.cloudflareaccess.com" })).toBe(false);
    expect(isAccessEnforced({ audience: "aud" })).toBe(false);
    expect(
      isAccessEnforced({
        teamDomain: "team.cloudflareaccess.com",
        audience: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe(true);
  });
});
