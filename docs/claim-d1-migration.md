# Claim curation SoT: Neo4j → Cloudflare D1

**Status:** Phase 2 Curate Claim reads prefer D1 (preview seed). Writes still Neo4j until Phase 3. Map / incidence still Neo4j until Phase 4.

**GitHub:** [diaphana-io/2026bdbv-dashboard#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19) → Linear **MATT** (one-way sync per [AGENTS.md](../AGENTS.md); triage priority/project in Linear after sync).

Related: Extract design [`docs/extract-issue.md`](./extract-issue.md) · Curate Workers serving [`docs/curate-graph-serving.md`](./curate-graph-serving.md) · Aura cutover [`docs/neo4j-aura.md`](./neo4j-aura.md).

## Motivation

Zone1 **Claim** rows (aggregate counts, incidence, and related Curate artifacts) are tabular: fingerprints, review status, lineage versions, conflicts, audit. They do not need a graph SoT. Keeping them on Neo4j couples Curate mutations and Map incidence to Bolt, which Workers must not hold hostage ([curate-graph-serving](./curate-graph-serving.md)).

**Cloudflare D1** is the chosen RDB (Workers-colocated; already assumed for Extract job rows in extract-issue). Case graph entities stay on Neo4j. No long-term dual SoT for Claims.

## Source-of-truth split

| Store | Source of truth | Not for |
|-------|-----------------|---------|
| **D1** | Curate tabular: `SourceDocument`, `Claim` (zone1 count assertions), `ClaimConflict`, `CurateAuditEvent`, `DismissedSource`; future `extract_jobs` / `classify_jobs` / discovery runs | Case graph, raw HTML/PDF bodies |
| **Neo4j** | Case graph: `Person`, `Case`, `TravelLeg`, `Hospitalization`, `Exposure`, `FollowUp`, `Facility`, `Outbreak`, and related relationships | Claim / SourceDocument / ClaimConflict / CurateAuditEvent (after migration) |
| **R2** | Source blobs + derived read snapshots (inbox / conflicts / map claim JSON). Snapshots are derived from D1 after migration | Approval SoT (always D1 for Claims) |
| **AdminUnit** | Geographic master stays Neo4j (or static JSON) for now. Claim `subject_ref` is a zone1 code **string** in D1 — no mandatory FK |

```text
  D1 tabular                    Neo4j graph
  ├─ SourceDocument             ├─ Case / Person / Travel / Exposure
  ├─ Claim (zone1 counts)       ├─ Hospitalization / FollowUp / Facility
  ├─ ClaimConflict              └─ Outbreak / AdminUnit (geo master)
  └─ CurateAuditEvent / DismissedSource

  R2: source bodies + map/curate claim snapshots (derived)
```

**Map / incidence:** after migration, approved Claims are read from **D1** (or a D1-derived R2 snapshot). Neo4j Claim matching for country-stats / snapshot / incidence is retired in Phase 4.

**UI note:** Claim curation and Case curation may separate in the product IA; this issue owns the **persistence** cutover. Source workspace IA is a separate slice.

## Migration phases

| Phase | What | Done when |
|-------|------|-----------|
| **0 Policy** | This doc + GitHub issue | Issue published; pointers in remaining-tasks / extract-issue |
| **1 Schema** | D1 migrations: `sources`, `claims`, `claim_conflicts`, `curate_audit_events`, `dismissed_sources` + indexes (`normalized_url`, fingerprint, `lineage_id`, `as_of`) | Local / preview migrate works |
| **2 Reads** | `lib/data` Claim / Inbox / Conflict / Catalog prefer D1 → Neo4j → JSON. Map / incidence still Neo4j | Curate SSR reads D1 (preview seed) |
| **3 Writes** | `/api/curate/*` persist targets D1; stop Neo4j Claim writes | Approve / Reject / Inbox / Conflicts persist D1-only |
| **4 Map** | `country-stats` / snapshot / incidence from D1 or R2 snapshot | Map independent of Neo4j Claim |
| **5 Cleanup** | Remove Claim nodes from seed; drop Claim constraints / Cypher; final updates to extract-issue / graph-model | Aura has no `Claim` label |

**Dual-write window:** only a short Phase 2→3 overlap (read D1 first, write both). Do not keep a long-lived dual SoT.

## Current code dependencies (pre-migration)

| Area | Role today |
|------|------------|
| [`apps/web/lib/neo4j-curate.ts`](../apps/web/lib/neo4j-curate.ts) | Curate **writes**: resolve conflict, dismiss source, submit/update source, review claim, rollback claim |
| [`apps/web/lib/neo4j-queries.ts`](../apps/web/lib/neo4j-queries.ts) | Curate / Map **reads**: `getClaimsNeo4j`, conflicts, inbox, catalog source+claims, incidence (`claim_type = 'incidence'`), country case_count aggregates |
| `/api/curate/*` | Thin routes → persist helpers (review-claim, resolve-conflict, dismiss-source, submit-source, update-source, rollback-claim, pipeline-status, …) |
| Map / incidence | Snapshot and country-stats paths that match Neo4j `Claim` for approved counts / incidence series |
| Bundled JSON | `apps/web/data/*.json` fallback when Neo4j unavailable (stays as last-resort until D1 + R2 snapshots) |

Phase 2–4 replace these Claim/Source/Conflict paths with D1 (and optional R2 snapshots). Case graph queries in `neo4j-queries.ts` remain Neo4j.

## Relationship to Extract ([`docs/extract-issue.md`](./extract-issue.md))

Extract issue Storage currently lists Neo4j as SoT for `SourceDocument` / `Claim` / `ClaimConflict` / `CurateAuditEvent`, and D1 for job rows only. **That Claim SoT is superseded by this migration:** Extract persist target becomes **D1 INSERT** (not Neo4j MERGE) for claims and curated sources once Phase 3 lands. Job tables (`discovery_runs`, `extract_jobs`, `classify_jobs`) stay on D1 as already designed. R2 remains blobs + derived read models. Production `EXTRACT_ENABLED=false` until Extract implementation follow-ups; this migration unblocks a coherent persist target before that wiring.

## Acceptance (Phase 0)

- [x] `docs/claim-d1-migration.md` exists with SoT split, phases 0–5, dependencies, out of scope
- [x] GitHub Issue opened; this doc header links to it ([#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19))
- [x] `docs/remaining-tasks.md` lists the open item
- [x] `docs/extract-issue.md` Storage section notes Claim SoT → D1 (supersede, not full rewrite)

## Phase 1 — Schema + two-DB binding

**Done when:** local migrate applies; production and preview each have a **separate** D1; Worker `env.DB` switches on `isPreview`. Curate / Map Claim I/O remains Neo4j.

### Two-DB policy

| Environment | D1 name | `database_id` | Role |
|-------------|---------|---------------|------|
| **production** | `bdbv-curate` | `13554abd-a4de-4194-84cb-3cca82a5d7bf` | Production Curate Claim SoT (Phase 3+). Bound only when `isPreview` is false |
| **preview** | `bdbv-curate-preview` | `8c803639-56c6-405c-8dba-157e054a483a` | **Test / Workers Preview.** Safe to wipe or seed. Bound when `isPreview` is true |

- Same schema (`apps/web/migrations/`). **Data is not shared** (no preview → prod copy by default).
- Do **not** use a single DB with `preview_database_id` conflation — two instances, one binding name `DB`.
- Wired in [`apps/web/cloudflare.config.ts`](../apps/web/cloudflare.config.ts) via `bindings.d1({ name, id })` (cf/config maps `id` → wrangler `database_id`). Migrations directory is `migrations/` (default; CLI helper [`apps/web/wrangler.d1.jsonc`](../apps/web/wrangler.d1.jsonc) sets `migrations_dir` for named apply).
- Env type: `DB: D1Database` on `Cloudflare.Env` / `Env` in [`apps/web/env.d.ts`](../apps/web/env.d.ts).

### DDL summary

Migration: [`apps/web/migrations/0001_claim_curate.sql`](../apps/web/migrations/0001_claim_curate.sql)

| Table | Notes |
|-------|--------|
| `sources` | SourceDocument fields; UNIQUE `normalized_url` |
| `claims` | Claim + curated `source_id` FK → `sources` ON DELETE RESTRICT; JSON `object_value` / `review_policy` as TEXT |
| `claim_conflicts` | FKs to `claims` ON DELETE RESTRICT; index on `status` |
| `curate_audit_events` | Append-only audit |
| `dismissed_sources` | PK `normalized_url` (+ `dismissed_at`) |

Indexes: `claims(claim_fingerprint)`, `claims(lineage_id)`, `claims(as_of_date)`, `claims(source_id)`, `claims(review_status, claim_type, subject_ref)`.

### Apply commands

From `apps/web` (Wrangler uses the CLI helper config; `cf` takes database UUID):

```text
# Local — both names
npx wrangler d1 migrations apply bdbv-curate --local --config wrangler.d1.jsonc
npx wrangler d1 migrations apply bdbv-curate-preview --local --config wrangler.d1.jsonc

# Equivalent (cf CLI; ID required)
npx cf d1 migrations apply 13554abd-a4de-4194-84cb-3cca82a5d7bf --local --dir migrations
npx cf d1 migrations apply 8c803639-56c6-405c-8dba-157e054a483a --local --dir migrations

# Phase 1 remote: preview / test only
npx wrangler d1 migrations apply bdbv-curate-preview --remote --config wrangler.d1.jsonc
# production --remote: defer until near Phase 3
```

Verify five tables: `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name` → `sources`, `claims`, `claim_conflicts`, `curate_audit_events`, `dismissed_sources` (plus `d1_migrations`).

### Acceptance (Phase 1)

- [x] `0001_claim_curate.sql` in repo
- [x] Two D1 databases created; config selects by `isPreview` (no `preview_database_id`)
- [x] `--local` migrate succeeded; five tables present
- [x] Docs state preview = test, data not shared with prod; linked from [#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19)
- [x] App Claim reads/writes still Neo4j (no Phase 2–4 switches in this slice)

## Phase 2 — Curate Claim reads (D1 → Neo4j → JSON)

**Done when:** Curate SSR Claim getters can read D1; empty / unbound D1 falls back to Neo4j then bundled JSON; Map / incidence / Case graph stay Neo4j; writes stay Neo4j.

### Read priority (Claim Curate only)

```text
preferFixtureData → bundled JSON only
else D1 (env.DB bound AND sources COUNT ≥ 1)
  → else Neo4j (configured)
  → else bundled JSON
```

Empty `sources` is treated as a D1 miss so production Curate does not silently show fixture data before Phase 3 seed/writes. Isolate TTL cache (`invalidateGraphReadCache`) is shared across D1 and Neo4j hits for the same keys.

| Getter | Phase 2 path |
|--------|----------------|
| `getClaims` / `getSources` / `getConflictViews` / `getInboxCandidates` | D1 → Neo4j → JSON |
| `getCatalogSources` / `getSourceCatalogDetail` | D1 → Neo4j → JSON |
| Map / incidence / cases / contacts / measures / KPIs / country-stats | **unchanged** (Neo4j → JSON) |

Implementation: [`apps/web/lib/d1.ts`](../apps/web/lib/d1.ts) (`getDb` via `cloudflare:workers` → `env.DB`), [`apps/web/lib/d1-queries.ts`](../apps/web/lib/d1-queries.ts), [`apps/web/lib/data.ts`](../apps/web/lib/data.ts) `fromD1OrNeo4jOrJson`.

### Preview seed (not production)

```text
# From repo root — seeds bdbv-curate-preview local + remote only
npm run seed:d1-curate
npm run seed:d1-curate -- --local-only
npm run seed:d1-curate -- --remote-only
```

Script: [`scripts/seed-d1-curate.mjs`](../scripts/seed-d1-curate.mjs). Input: `data/curated/{sources,inbox_candidates,claims,conflicts}.json` (+ optional `curate_audit_events.json`). FK order: sources → inbox candidate sources → claims → conflicts → audits. **Does not seed production `bdbv-curate`.**

### Acceptance (Phase 2)

- [x] Claim Curate getters use D1 → Neo4j → JSON; fixture mode skips D1
- [x] Empty D1 falls through to Neo4j (not fixture) when Neo4j is configured
- [x] Seed script targets preview + local only
- [x] Map / incidence / Case graph getters untouched
- [x] Local preview seed verified (`npm run seed:d1-curate -- --local-only` → 6 sources on `bdbv-curate-preview`); remote seed when Cloudflare auth is available

## Out of scope (Phase 0 and this tracker’s policy slice)

- Case Curate UI
- Accept→Open / Source workspace IA (separate plans OK)
- Postgres or non-D1 RDB
- Live Jev Extract wiring (still gated by extract-issue)
- Phase 3–4: Curate write cutover, Map / incidence D1, job tables, Case graph changes
