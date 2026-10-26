import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webLib = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(webLib, "../../..");

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("Phase 5: no Neo4j Claim / Conflict / Audit leftovers", () => {
  it("neo4j-queries.ts has no :Claim or ClaimConflict Cypher", () => {
    const src = readRepo("apps/web/lib/neo4j-queries.ts");
    expect(src).not.toMatch(/:Claim\b/);
    expect(src).not.toMatch(/ClaimConflict/);
    expect(src).not.toMatch(/CurateAuditEvent/);
    expect(src).not.toMatch(/getClaimsNeo4j/);
    expect(src).not.toMatch(/getIncidenceSeriesNeo4j/);
    expect(src).not.toMatch(/getConflictViewsNeo4j/);
    expect(src).not.toMatch(/getMapAggregatesFromClaimsNeo4j/);
  });

  it("neo4j-curate.ts is removed (Claim writes are D1-only)", () => {
    let missing = false;
    try {
      readRepo("apps/web/lib/neo4j-curate.ts");
    } catch {
      missing = true;
    }
    expect(missing).toBe(true);
  });

  it("constraints.cypher has no Claim / Conflict / Audit constraints", () => {
    const cypher = readRepo("infra/neo4j/constraints.cypher")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(cypher).not.toMatch(/:Claim\b/);
    expect(cypher).not.toMatch(/ClaimConflict/);
    expect(cypher).not.toMatch(/CurateAuditEvent/);
    expect(cypher).not.toMatch(/claim_id/);
    expect(cypher).not.toMatch(/claim_fingerprint/);
    expect(cypher).not.toMatch(/conflict_id/);
    expect(cypher).not.toMatch(/curate_audit/);
  });

  it("seed-neo4j.mjs does not MERGE Claim or read claims/conflicts JSON", () => {
    const seed = readRepo("scripts/seed-neo4j.mjs");
    expect(seed).not.toMatch(/MERGE \(cl:Claim/);
    expect(seed).not.toMatch(/MERGE \(cf:ClaimConflict/);
    expect(seed).not.toMatch(/readJson\("claims\.json"\)/);
    expect(seed).not.toMatch(/readJson\("conflicts\.json"\)/);
    expect(seed).not.toMatch(/MATCH \(cl:Claim\)/);
  });
});
