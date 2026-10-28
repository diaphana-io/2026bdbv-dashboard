import { describe, expect, it } from "vitest";
import {
  accessLoginRedirectUrl,
  isAccessEnforced,
  isAccessProtectedPath,
} from "./access";

describe("isAccessProtectedPath (Map Worker — legacy nested Curate)", () => {
  it("protects nested curate UI and API paths", () => {
    expect(isAccessProtectedPath("/curate")).toBe(true);
    expect(isAccessProtectedPath("/curate/overview")).toBe(true);
    expect(isAccessProtectedPath("/curate/inbox")).toBe(true);
    expect(isAccessProtectedPath("/api/curate/resolve-conflict")).toBe(true);
    expect(isAccessProtectedPath("/api/curate")).toBe(true);
  });

  it("leaves public dashboard routes open", () => {
    expect(isAccessProtectedPath("/")).toBe(false);
    expect(isAccessProtectedPath("/cases")).toBe(false);
    expect(isAccessProtectedPath("/api/hello")).toBe(false);
    expect(isAccessProtectedPath("/api/map/case")).toBe(false);
    expect(isAccessProtectedPath("/curators")).toBe(false);
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

describe("accessLoginRedirectUrl", () => {
  it("builds team login URL for the request host", () => {
    const url = accessLoginRedirectUrl(
      "https://example.workers.dev/app/curate/inbox",
      { teamDomain: "https://tetra4rnav.cloudflareaccess.com", audience: "aud" },
    );
    expect(url).toContain(
      "https://tetra4rnav.cloudflareaccess.com/cdn-cgi/access/login/example.workers.dev",
    );
    expect(url).toContain("redirect_url=%2Fapp%2Fcurate%2Finbox");
  });
});
