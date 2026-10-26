# Claim curation SoT: Neo4j → Cloudflare D1

**Status:** Phase 5 complete in code — Claim / Conflict / Audit SoT is **D1 → JSON** only (no Neo4j Claim fallback). Case / Travel / Exposure / AdminUnit stay Neo4j; `SourceDocument` remains for Case `SOURCED_FROM`. Operators still run Aura DETACH DELETE manually (recipe below).

**GitHub:** [diaphana-io/2026bdbv-dashboard#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19) → Linear **MATT** (one-way sync per [AGENTS.md](../AGENTS.md); triage priority/project in Linear after sync).

Related: Extract design [`docs/extract-issue.md`](./extract-issue.md) · Curate Workers serving [`docs/curate-graph-serving.md`](./curate-graph-serving.md) · Aura cutover [`docs/neo4j-aura.md`](./neo4j-aura.md).

## Motivation

Zone1 **Claim** rows (aggregate counts, incidence, and related Curate artifacts) are tabular: fingerprints, review status, lineage versions, conflicts, audit. They do not need a graph SoT. Keeping them on Neo4j couples Curate mutations and Map incidence to Bolt, which Workers must not hold hostage ([curate-graph-serving](./curate-graph-serving.md)).

**Cloudflare D1** is the chosen RDB (Workers-colocated; already assumed for Extract job rows in extract-issue). Case graph entities stay on Neo4j. No long-term dual SoT for Claims.

## Source-of-truth split

| Store | Source of truth | Not for |
|-------|-----------------|---------|
| **D1** | Curate tabular: `SourceDocument`, `Claim` (zone1 count assertions), `ClaimConflict`, `CurateAuditEvent`, `DismissedSource`; future `extract_jobs` / `classify_jobs` / discovery runs | Case graph, raw HTML/PDF bodies |
| **Neo4j** | Case graph: `Person`, `Case`, `TravelLeg`, `Hospitalization`, `Exposure`, `FollowUp`, `Facility`, `Outbreak`, `AdminUnit`, and `SourceDocument` for Case `SOURCED_FROM` | Claim / ClaimConflict / CurateAuditEvent (D1); Claim `FROM` edges |
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

**Map / incidence:** approved Claims are read from **D1** (empty D1 → bundled JSON). Map graph layers stay Neo4j without Claim MATCH. `getCountryStats` remains a stub (`[]`). Derived R2 map dumps are a follow-up.

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
| [`apps/web/lib/d1-curate.ts`](../apps/web/lib/d1-curate.ts) | Curate **writes** (Phase 3+): resolve conflict, dismiss/submit/update source, review/rollback claim |
| [`apps/web/lib/neo4j-queries.ts`](../apps/web/lib/neo4j-queries.ts) | Case graph + Map graph layers only (no Claim Cypher after Phase 5) |
| [`apps/web/lib/d1-queries.ts`](../apps/web/lib/d1-queries.ts) | Curate + Map Claim **reads** (incidence, approved case_count heads) |
| `/api/curate/*` | Thin routes → D1 persist helpers (Phase 3) |
| Map / incidence | D1 claims + AdminUnit join + Neo4j Case/Travel/Exposure; D1 miss → JSON aggregates |
| Bundled JSON | Fallback when D1 empty / unbound (`data/seed/curated/claims.json` kept for seed + JSON) |

## Relationship to Extract ([`docs/extract-issue.md`](./extract-issue.md))

Extract Storage is aligned with Phase 5: Claim/Source/Conflict/Audit Curate SoT is **D1**; Extract persist target is **D1 INSERT** (not Neo4j MERGE). Neo4j keeps the Case graph (+ `SourceDocument` for `SOURCED_FROM`). Job tables (`discovery_runs`, `extract_jobs`, `classify_jobs`) stay on D1. R2 remains blobs + derived read models. Production `EXTRACT_ENABLED=false` until Extract implementation follow-ups.

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
# production --remote: see Phase 3 (requires Cloudflare auth)
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

Script: [`scripts/seed-d1-curate.mjs`](../scripts/seed-d1-curate.mjs). Input: `data/seed/curated/{sources,inbox_candidates,claims,conflicts}.json` (+ optional `curate_audit_events.json`). FK order: sources → inbox candidate sources → claims → conflicts → audits. **Does not seed production `bdbv-curate` unless `--production` is passed (Phase 3).**

### Acceptance (Phase 2)

- [x] Claim Curate getters use D1 → Neo4j → JSON; fixture mode skips D1
- [x] Empty D1 falls through to Neo4j (not fixture) when Neo4j is configured
- [x] Seed script targets preview + local only
- [x] Map / incidence / Case graph getters untouched
- [x] Local preview seed verified (`npm run seed:d1-curate -- --local-only` → 6 sources on `bdbv-curate-preview`); remote seed when Cloudflare auth is available

## Phase 3 — Curate Claim writes (D1-only)

**Done when:** `/api/curate/*` Claim/Source/Conflict persist is **D1 only** (fixture mode skips persist). Neo4j Claim writes are removed from Worker Curate routes. Map / incidence still read Neo4j Claims until Phase 4.

### Write policy

```text
preferFixtureData → persist false (no D1 / Neo4j write)
else getDb() bound → D1 persist + invalidateGraphReadCache
else → 503 d1_unavailable
```

- Helper: `shouldPersistCurateTabular()` in [`apps/web/lib/curate-data-source.server.ts`](../apps/web/lib/curate-data-source.server.ts) (`!fixture && getDb()`).
- Persist implementation: [`apps/web/lib/d1-curate.ts`](../apps/web/lib/d1-curate.ts) (mirrors former [`neo4j-curate.ts`](../apps/web/lib/neo4j-curate.ts) shapes; uses D1 `batch()`). Neo4j persist helpers may remain as dead code until Phase 5 cleanup.
- No long-lived dual-write. Preview D1 verify first; then routes call D1 only.

| Route | Persist |
|-------|---------|
| `submit-source` | INSERT `sources` (candidate); duplicate `normalized_url` → 409 |
| `update-source` | UPDATE candidate `sources` |
| `dismiss-source` | UPSERT `dismissed_sources` + status |
| `review-claim` | INSERT/UPDATE `claims` + `curate_audit_events`; optional `claim_conflicts` |
| `resolve-conflict` | UPDATE `claim_conflicts` |
| `rollback-claim` | Engine shapes payload; D1 supersedes head + pending claim + audit |

### Prod remote migrate + one-time seed (opt-in)

Apply schema to production D1 **before** relying on Worker writes against empty prod:

```text
# From apps/web — requires Cloudflare auth (CLOUDFLARE_API_TOKEN or `wrangler login`)
npx wrangler d1 migrations apply bdbv-curate --remote --config wrangler.d1.jsonc
```

Seed production **only with explicit `--production`** (default remains preview-only; never silent prod seed):

```text
# From repo root
npm run seed:d1-curate -- --production --remote-only
# or local prod binding for dry-run
npm run seed:d1-curate -- --production --local-only
```

Script: [`scripts/seed-d1-curate.mjs`](../scripts/seed-d1-curate.mjs). Without `--production`, target is still `bdbv-curate-preview` only.

**Auth note (2026-10-25):** remote `bdbv-curate` migrate was attempted from CI/agent; Wrangler returned *non-interactive environment requires `CLOUDFLARE_API_TOKEN`*. Re-run the migrate + `--production --remote-only` seed from a logged-in shell or with a token before production cutover. Empty prod D1 must not receive Curate writes until seed (or Neo4j export) lands — otherwise reads miss existing Aura Claims until Phase 4 Map also moves.

### Acceptance (Phase 3)

- [x] Curate Claim API persists to D1 when `shouldPersistCurateTabular`; fixture → no persist; missing DB → 503
- [x] Neo4j Claim write calls removed from `/api/curate/*` Worker routes
- [x] `seed:d1-curate --production` opt-in; prod migrate/seed commands documented (remote apply pending Cloudflare auth)
- [ ] Preview smoke: Open/Approve then Curate SSR reads from D1
- [x] Map / incidence still Neo4j Claim reads (Phase 4) — superseded by Phase 4 below

## Phase 4 — Map Claim reads (D1 aggregates + Neo4j graph)

**Done when:** Map **approved Claim aggregates** and **incidence** do not depend on Neo4j `Claim` on the happy path. Case / Travel / Exposure / Outbreak stay Neo4j. `getCountryStats` stays a stub.

### Read priority (Map Claim slices)

```text
preferFixtureData → bundled JSON only
else D1 (env.DB bound AND sources COUNT ≥ 1)
  → incidence: getIncidenceSeriesD1
  → snapshot aggregates: getApprovedCaseCountClaimsD1(asOf) joined to AdminUnit lat/lon
     (Neo4j AdminUnit, else JSON admin_units)
  → snapshot graph: getMapSnapshotGraphNeo4j (no Claim MATCH); JSON graph if Neo4j fails
  → else Neo4j Claim fallback (getIncidenceSeriesNeo4j / getMapAggregatesFromClaimsNeo4j)
  → else bundled JSON
```

Empty `sources` is a D1 miss (same Curate pattern) so production Map does not silently show empty aggregates before Phase 3 prod seed.

| Getter | Phase 4 path |
|--------|----------------|
| `getIncidenceSeries` | D1 → Neo4j → JSON |
| `getMapSnapshot` | D1 case_count + AdminUnit join + Neo4j graph; Neo4j Claim aggregates only on D1 miss |
| `getCountryStats` | **unchanged stub** `[]` (Neo4j → JSON) |

Implementation: [`apps/web/lib/d1-queries.ts`](../apps/web/lib/d1-queries.ts) (`getIncidenceSeriesD1`, `getApprovedCaseCountClaimsD1`), [`apps/web/lib/map-snapshot.ts`](../apps/web/lib/map-snapshot.ts) (join/compose), [`apps/web/lib/neo4j-queries.ts`](../apps/web/lib/neo4j-queries.ts) (`getMapSnapshotGraphNeo4j`, `getAggregateAdminUnitsNeo4j`; Claim MATCH isolated in `getMapAggregatesFromClaimsNeo4j`), [`apps/web/lib/data.ts`](../apps/web/lib/data.ts).

**Not in Phase 4:** R2 derived map dumps; Aura `Claim` label deletion (Phase 5); country-stats implementation; Curate UI.

### Acceptance (Phase 4)

- [x] `getIncidenceSeries` prefers D1 → Neo4j → JSON
- [x] Map aggregates from D1 claims + AdminUnit join; Case pins / travel / exposure from Neo4j graph
- [x] Happy-path Neo4j map graph has no `MATCH (cl:Claim)`; Claim Cypher isolated to fallback
- [x] Fixture / empty D1 falls back to JSON or Neo4j
- [x] Docs + [#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19) updated

## Phase 5 — Cleanup (no Neo4j Claim fallback)

**Done when:** code / seed / constraints have **no** Claim / ClaimConflict / CurateAuditEvent read or write path on Neo4j. Curate + Map Claim data: **D1 → JSON**. Operators may purge leftover Aura nodes with the Cypher below (not run automatically from CI).

### Read priority (final)

```text
preferFixtureData → bundled JSON only
else D1 (env.DB bound AND sources COUNT ≥ 1)
  → Curate Claim / Inbox / Conflicts / Catalog / incidence
  → Map aggregates: getApprovedCaseCountClaimsD1 + AdminUnit join
else bundled JSON (no Neo4j Claim)

Map graph: Neo4j Case/Travel/Exposure (JSON graph if Bolt fails)
```

| Area | Phase 5 change |
|------|----------------|
| `data.ts` | Claim paths use `fromD1OrJson`; map miss → JSON aggregates + Neo4j graph |
| `neo4j-queries.ts` | Claim / conflict / catalog Claim Cypher removed |
| `neo4j-curate.ts` | **Deleted** (writes already D1-only since Phase 3) |
| `scripts/seed-neo4j.mjs` | No `claims.json` / `conflicts.json` MERGE |
| `infra/neo4j/constraints.cypher` | Claim / fingerprint / conflict / audit constraints dropped from file |
| Tests | `phase5-claim-cleanup.test.ts` + `data-cache.test.ts` assert no Claim fallback |

### Aura cleanup (manual / authenticated operator)

Do **not** run from unauthenticated CI agents. After D1 prod seed is verified:

```cypher
MATCH (a:CurateAuditEvent) DETACH DELETE a;
MATCH (cf:ClaimConflict) DETACH DELETE cf;
MATCH (c:Claim) DETACH DELETE c;
// optional later: orphan SourceDocument with no Case SOURCED_FROM — defer
```

Re-apply constraints from [`infra/neo4j/constraints.cypher`](../infra/neo4j/constraints.cypher) on a clean DB, or DROP obsolete Claim/Conflict/Audit constraints in Browser if they still exist from earlier seeds:

```cypher
DROP CONSTRAINT claim_id IF EXISTS;
DROP CONSTRAINT claim_fingerprint_id IF EXISTS;
DROP CONSTRAINT conflict_id IF EXISTS;
DROP CONSTRAINT curate_audit_event_id IF EXISTS;
DROP INDEX claim_review_status IF EXISTS;
DROP INDEX claim_as_of_date IF EXISTS;
DROP INDEX claim_category IF EXISTS;
DROP INDEX claim_type IF EXISTS;
DROP INDEX conflict_status IF EXISTS;
```

### Acceptance (Phase 5)

- [x] Neo4j Claim read/write fallbacks removed (D1 → JSON)
- [x] seed-neo4j / constraints stripped of Claim · Conflict · Audit
- [x] Contract + unit tests green (`@bdbv/web`)
- [x] Docs + Aura recipe + [#19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19) comment
- [ ] Operator: DETACH DELETE on production Aura after D1 cutover verified (manual)

## Out of scope (Phase 0 and this tracker’s policy slice)

- Case Curate UI
- Adopt→Catalog / Source workspace IA — see [curate-ui.md](./curate-ui.md)
- Postgres or non-D1 RDB
- Live Jev Extract wiring (still gated by extract-issue)
- Case `SourceDocument` full removal; R2 map dumps; country-stats implementation
