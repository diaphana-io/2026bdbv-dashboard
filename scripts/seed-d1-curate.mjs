#!/usr/bin/env node
/**
 * Seed data/curated Claim Curate rows into D1 preview + local only.
 * Never targets production bdbv-curate (Phase 3 keeps prod on Neo4j until writes move).
 *
 * Usage (from repo root):
 *   npm run seed:d1-curate
 *   npm run seed:d1-curate -- --local-only
 *   npm run seed:d1-curate -- --remote-only
 *
 * Requires wrangler auth for --remote. Runs from apps/web with wrangler.d1.jsonc.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const curatedDir = join(root, "data", "curated");
const webDir = join(root, "apps", "web");
const config = "wrangler.d1.jsonc";
const DB_NAME = "bdbv-curate-preview";

const args = new Set(process.argv.slice(2));
const localOnly = args.has("--local-only");
const remoteOnly = args.has("--remote-only");
if (localOnly && remoteOnly) {
  console.error("Use only one of --local-only / --remote-only");
  process.exit(1);
}

function readJson(name) {
  const path = join(curatedDir, name);
  if (!existsSync(path)) {
    throw new Error(`Missing curated file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertSource(s) {
  return `INSERT INTO sources (
    id, url, normalized_url, title, publisher, kind, evidence_class,
    duplicate_level, duplicate_of_source_id, published_at, discovered_at,
    discovery_query, content_hash, curation_status
  ) VALUES (
    ${sqlLiteral(s.id)},
    ${sqlLiteral(s.url)},
    ${sqlLiteral(s.normalized_url ?? s.url)},
    ${sqlLiteral(s.title ?? null)},
    ${sqlLiteral(s.publisher ?? null)},
    ${sqlLiteral(s.kind)},
    ${sqlLiteral(s.evidence_class ?? "other")},
    ${sqlLiteral(s.duplicate_level ?? "none")},
    ${sqlLiteral(s.duplicate_of_source_id ?? null)},
    ${sqlLiteral(s.published_at ?? null)},
    ${sqlLiteral(s.discovered_at ?? null)},
    ${sqlLiteral(s.discovery_query ?? null)},
    ${sqlLiteral(s.content_hash ?? null)},
    ${sqlLiteral(s.curation_status)}
  );`;
}

function insertClaim(c) {
  const objectValue =
    typeof c.object_value === "string"
      ? c.object_value
      : JSON.stringify(c.object_value ?? {});
  const reviewPolicy =
    c.review_policy == null
      ? null
      : typeof c.review_policy === "string"
        ? c.review_policy
        : JSON.stringify(c.review_policy);
  return `INSERT INTO claims (
    id, source_id, claim_type, claim_category, subject_ref, object_value,
    as_of_date, claim_fingerprint, lineage_id, version, is_head,
    confidence, excerpt, extractor, review_status, review_policy,
    reviewed_at, reviewed_by
  ) VALUES (
    ${sqlLiteral(c.id)},
    ${sqlLiteral(c.source_id)},
    ${sqlLiteral(c.claim_type)},
    ${sqlLiteral(c.claim_category ?? null)},
    ${sqlLiteral(c.subject_ref)},
    ${sqlLiteral(objectValue)},
    ${sqlLiteral(c.as_of_date)},
    ${sqlLiteral(c.claim_fingerprint)},
    ${sqlLiteral(c.lineage_id ?? null)},
    ${sqlLiteral(c.version ?? 1)},
    ${c.is_head == null ? "NULL" : c.is_head ? "1" : "0"},
    ${sqlLiteral(c.confidence)},
    ${sqlLiteral(c.excerpt ?? null)},
    ${sqlLiteral(c.extractor ?? "human")},
    ${sqlLiteral(c.review_status)},
    ${sqlLiteral(reviewPolicy)},
    ${sqlLiteral(c.reviewed_at ?? null)},
    ${sqlLiteral(c.reviewed_by ?? null)}
  );`;
}

function insertConflict(cf) {
  return `INSERT INTO claim_conflicts (
    id, claim_a_id, claim_b_id, subject_ref, claim_type, status, detected_at,
    resolution_note
  ) VALUES (
    ${sqlLiteral(cf.id)},
    ${sqlLiteral(cf.claim_a_id)},
    ${sqlLiteral(cf.claim_b_id)},
    ${sqlLiteral(cf.subject_ref)},
    ${sqlLiteral(cf.claim_type)},
    ${sqlLiteral(cf.status)},
    ${sqlLiteral(cf.detected_at)},
    ${sqlLiteral(cf.resolution_note ?? null)}
  );`;
}

function insertAudit(a) {
  return `INSERT INTO curate_audit_events (
    id, at, actor, action, lineage_id, claim_id, source_id,
    from_version, to_version, reason, payload_digest
  ) VALUES (
    ${sqlLiteral(a.id)},
    ${sqlLiteral(a.at)},
    ${sqlLiteral(a.actor)},
    ${sqlLiteral(a.action)},
    ${sqlLiteral(a.lineage_id ?? null)},
    ${sqlLiteral(a.claim_id ?? null)},
    ${sqlLiteral(a.source_id ?? null)},
    ${sqlLiteral(a.from_version ?? null)},
    ${sqlLiteral(a.to_version ?? null)},
    ${sqlLiteral(a.reason ?? null)},
    ${sqlLiteral(a.payload_digest ?? null)}
  );`;
}

function buildSeedSql() {
  const sources = readJson("sources.json");
  const inbox = readJson("inbox_candidates.json");
  const claims = readJson("claims.json");
  const conflicts = readJson("conflicts.json");
  const auditsPath = join(curatedDir, "curate_audit_events.json");
  const audits = existsSync(auditsPath) ? readJson("curate_audit_events.json") : [];

  // D1 UNIQUE(normalized_url): skip inbox rows that collide with curated sources
  // (exact_url duplicates stay Neo4j/fixture demos until Phase 3 write path).
  const seenNorm = new Set(
    sources.map((s) => String(s.normalized_url ?? s.url).toLowerCase()),
  );
  const inboxInsertable = [];
  for (const row of inbox) {
    const norm = String(row.normalized_url ?? row.url).toLowerCase();
    if (seenNorm.has(norm)) {
      console.warn(
        `skip inbox ${row.id}: normalized_url already seeded (${norm})`,
      );
      continue;
    }
    seenNorm.add(norm);
    inboxInsertable.push(row);
  }

  const lines = [
    "PRAGMA foreign_keys = OFF;",
    "DELETE FROM curate_audit_events;",
    "DELETE FROM claim_conflicts;",
    "DELETE FROM claims;",
    "DELETE FROM dismissed_sources;",
    "DELETE FROM sources;",
    "PRAGMA foreign_keys = ON;",
    "",
    "-- curated sources (non-candidate)",
    ...sources.map(insertSource),
    "",
    `-- inbox candidates (${inboxInsertable.length}/${inbox.length}; unique normalized_url only)`,
    ...inboxInsertable.map(insertSource),
    "",
    "-- claims",
    ...claims.map(insertClaim),
    "",
    "-- conflicts",
    ...conflicts.map(insertConflict),
  ];
  if (audits.length > 0) {
    lines.push("", "-- audit events", ...audits.map(insertAudit));
  }
  lines.push("");
  return lines.join("\n");
}

function resolveWranglerEntry() {
  const candidates = [
    join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
    join(webDir, "node_modules", "wrangler", "bin", "wrangler.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function wrangler(extraArgs, opts = {}) {
  const entry = resolveWranglerEntry();
  const result = entry
    ? spawnSync(process.execPath, [entry, ...extraArgs], {
        cwd: webDir,
        stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit",
        encoding: opts.capture ? "utf8" : undefined,
        env: process.env,
      })
    : spawnSync("npx", ["wrangler", ...extraArgs], {
        cwd: webDir,
        stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit",
        encoding: opts.capture ? "utf8" : undefined,
        shell: true,
        env: process.env,
      });
  if (result.status !== 0) {
    if (opts.capture) {
      console.warn(result.stderr || result.stdout);
    }
    throw new Error(`wrangler failed (${result.status}): ${extraArgs.join(" ")}`);
  }
  return result;
}

function applyMigrations(remote) {
  const flag = remote ? "--remote" : "--local";
  console.log(`\n→ migrations apply ${DB_NAME} ${flag}`);
  wrangler([
    "d1",
    "migrations",
    "apply",
    DB_NAME,
    flag,
    "--config",
    config,
  ]);
}

function executeSqlFile(sqlPath, remote) {
  const flag = remote ? "--remote" : "--local";
  console.log(`\n→ execute seed ${DB_NAME} ${flag}`);
  wrangler([
    "d1",
    "execute",
    DB_NAME,
    flag,
    "--config",
    config,
    "--file",
    sqlPath,
  ]);
}

function countSources(remote) {
  const flag = remote ? "--remote" : "--local";
  try {
    const result = wrangler(
      [
        "d1",
        "execute",
        DB_NAME,
        flag,
        "--config",
        config,
        "--command",
        "SELECT COUNT(*) AS n FROM sources;",
        "--json",
      ],
      { capture: true },
    );
    const parsed = JSON.parse(result.stdout);
    const rows = Array.isArray(parsed)
      ? parsed.find((p) => p.results)?.results
      : parsed?.results;
    return rows?.[0]?.n ?? null;
  } catch (err) {
    console.warn(err instanceof Error ? err.message : err);
    return null;
  }
}

function main() {
  console.log(`Seeding D1 ${DB_NAME} from ${curatedDir}`);
  console.log("(production bdbv-curate is NOT seeded)");

  const outDir = join(root, "tmp");
  mkdirSync(outDir, { recursive: true });
  const sqlPath = join(outDir, "seed-d1-curate.sql");
  const sql = buildSeedSql();
  writeFileSync(sqlPath, sql, "utf8");
  console.log(`Wrote ${sqlPath} (${sql.split("\n").length} lines)`);

  const targets = [];
  if (!remoteOnly) targets.push({ remote: false, label: "local" });
  if (!localOnly) targets.push({ remote: true, label: "remote" });

  const summary = [];
  let failed = 0;
  for (const t of targets) {
    try {
      applyMigrations(t.remote);
      executeSqlFile(sqlPath, t.remote);
      const n = countSources(t.remote);
      summary.push({ target: t.label, sources: n, ok: true });
      console.log(`✓ ${DB_NAME} ${t.label}: sources=${n ?? "?"}`);
    } catch (err) {
      failed += 1;
      summary.push({
        target: t.label,
        sources: null,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`✗ ${DB_NAME} ${t.label}: ${summary.at(-1).error}`);
      if (t.remote) {
        console.error(
          "  Remote needs Cloudflare auth (CLOUDFLARE_API_TOKEN or `wrangler login`). Local seed is independent.",
        );
      }
    }
  }

  console.log("\nSeed summary:");
  for (const row of summary) {
    console.log(
      `  ${row.target}: ${row.ok ? `sources=${row.sources ?? "?"}` : "FAILED"}`,
    );
  }
  if (failed > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
