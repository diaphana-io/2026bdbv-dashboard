# Claim curation SoT: Neo4j → Cloudflare D1

**Status:** Phase 0 (policy + tracker). Implementation starts at Phase 1.

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
| **2 Reads** | `lib/data` Claim / Inbox / Conflict (and catalog claim lists) prefer D1 → else JSON. Map / incidence may still use Neo4j | Curate SSR reads D1 |
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

## Out of scope (Phase 0 and this tracker’s policy slice)

- D1 binding implementation or production migrate (Phase 1+)
- Case Curate UI
- Accept→Open / Source workspace IA (separate plans OK)
- Postgres or non-D1 RDB
- Live Jev Extract wiring (still gated by extract-issue)
