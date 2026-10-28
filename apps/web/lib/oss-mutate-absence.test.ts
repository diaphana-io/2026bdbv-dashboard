import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webLib = dirname(fileURLToPath(import.meta.url));
const webRoot = join(webLib, "..");
const repoRoot = join(webLib, "../../..");

const MUTATE_ROUTE_NAMES = [
  "adopt-source",
  "dismiss-source",
  "submit-source",
  "update-source",
  "review-claim",
  "resolve-conflict",
  "rollback-claim",
  "fetch-source-bib",
] as const;

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe("OSS mutate absence (G2b-oss)", () => {
  it("does not ship Curate UI or API route trees", () => {
    expect(existsSync(join(webRoot, "app/curate"))).toBe(false);
    expect(existsSync(join(webRoot, "app/api/curate"))).toBe(false);
    expect(existsSync(join(webRoot, "components/curate"))).toBe(false);
  });

  it("does not ship Curate write helpers", () => {
    expect(existsSync(join(webLib, "d1-curate.ts"))).toBe(false);
    expect(existsSync(join(webLib, "curate-api.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "scripts/seed-d1-curate.mjs"))).toBe(
      false,
    );
    expect(
      existsSync(join(webRoot, "scripts/deploy-ci-curate.mjs")),
    ).toBe(false);
  });

  it("package scripts do not build or deploy the Curate Worker", () => {
    const pkg = JSON.parse(
      readFileSync(join(webRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    expect(scripts["build:curate"]).toBeUndefined();
    expect(scripts["deploy:ci:curate"]).toBeUndefined();
    expect(JSON.stringify(scripts)).not.toMatch(/CURATE_WORKER=1/);
  });

  it("cloudflare.config is Map-only (/app)", () => {
    const cfg = readFileSync(join(webRoot, "cloudflare.config.ts"), "utf8");
    expect(cfg).toMatch(/name:\s*"bdbv-dashboard"/);
    expect(cfg).not.toMatch(/name:\s*"bdbv-curate-app"/);
    expect(cfg).not.toMatch(/CURATE_WORKER\s*=/);
    expect(cfg).not.toMatch(/CURATE_WORKER_FETCH_PATTERNS/);
    expect(cfg).toMatch(/APP_WORKER_FETCH_PATTERNS/);
  });

  it("cloudflare.config does not embed Access AUD or D1 UUIDs", () => {
    const cfg = readFileSync(join(webRoot, "cloudflare.config.ts"), "utf8");
    expect(cfg).toMatch(/CF_ACCESS_TEAM_DOMAIN:\s*bindings\.secret\(\)/);
    expect(cfg).toMatch(/CF_ACCESS_AUD:\s*bindings\.secret\(\)/);
    expect(cfg).not.toMatch(/cloudflareaccess\.com/);
    expect(cfg).not.toMatch(/\bid:\s*"[0-9a-f-]{36}"/);
    expect(cfg).not.toMatch(/"[0-9a-f]{64}"/);
    expect(cfg).toMatch(/name:\s*isPreview\s*\?\s*"bdbv-curate-preview"/);
  });

  it("no mutate route filenames remain under apps/web", () => {
    const files = listFilesRecursive(webRoot).map((f) =>
      f.replace(/\\/g, "/"),
    );
    for (const name of MUTATE_ROUTE_NAMES) {
      const hit = files.find((f) => f.includes(`/api/curate/${name}/`));
      expect(hit, name).toBeUndefined();
    }
  });
});
