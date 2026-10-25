# Extract / Curate workflow & Extract backend specification

**Status:** Approved design for [MATT-310](https://linear.app/diaphana/issue/MATT-310/bdbv-extract-backend-specification-blocks-production-extract) / [GitHub #2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) (one-way sync; supersedes MATT-309).

**Production gate:** `EXTRACT_ENABLED=false` until this design is closed as implemented for staging evaluation. Jev / R2 / D1 bindings are **follow-up** — this issue ships contracts, stubs, and Curate IA only.

## Summary

Semi-automatic Extract (`curate.extractClaims`) plugs into a human Curate pipeline. **Business logic and pipeline decisions live in Rust (`surv_engine`)**; Next / Workers stay thin (Access, HTTP, Neo4j/R2 I/O, UI). Until Extract is wired, production uses human claim entry + approve/reject only.

## Architecture: Rust is the source of truth

```text
Curate UI → thin Next API → (Neo4j / R2 params) → surv_wasm → surv_engine → result JSON
```

| Layer | Owns |
|-------|------|
| **`surv_engine` (`curate.*`)** | Normalize URL/hash, classify/dedupe/extract/approve/reject/conflict, revise/rollback/audit contracts |
| **Web / Workers** | Cloudflare Access, page shell, tables; read snapshots into command params; persist normalized records to Neo4j |
| **Jev adapter (follow-up)** | Rust traits (`Classifier` / `Extractor`); Workers: async job + R2; CLI/cron: native `surv_engine` |

Commands (contract + stubs in this issue):

| Command | Role |
|---------|------|
| `curate.discoverSources` | Enqueue candidates; **exact URL match skips enqueue** |
| `curate.classifySource` | Jev-like classify; unset → `status: not_configured`, `evidence_class: other` |
| `curate.checkDuplicate` | `duplicate_level`: `none \| exact_url \| content_hash \| possible` + ref ids |
| `curate.extractClaims` | Stub → later Jev extract/verify; always `pending_review` |
| `curate.approveClaim` / `rejectClaim` | Existing; future `min_approvers` here |
| `curate.detectConflict` / `resolveConflict` | Existing; both claims visible until human resolve |
| `curate.reviseClaim` / `rollbackClaim` / `appendAudit` | Append-only versioning + audit stubs |

**Discover enqueue vs Inbox flag:** exact URL → do not enqueue. Near match (content hash / possible) → enqueue **with** `duplicate_level` for curator review. Never auto-discard flagged rows.

## Storage: Neo4j / R2 / D1

Extends [Curate graph serving](./curate-graph-serving.md) (MATT-314): snapshot-first reads, mutation-only Bolt writes. **Workers must not hold responses hostage to Bolt.**

> **Supersede (Claim SoT):** Curate tabular SoT for `SourceDocument` / `Claim` / `ClaimConflict` / `CurateAuditEvent` moves from Neo4j to **Cloudflare D1**. Extract persist for claims becomes **D1 INSERT** (not Neo4j MERGE) once that migration lands. Policy and phases: [`docs/claim-d1-migration.md`](./claim-d1-migration.md) / [GitHub #19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19). The table below is the **pre-migration** Extract-era split; treat Claim/Source/Conflict/Audit rows as targeting D1 going forward. Neo4j remains SoT for the Case graph.

| Store | Source of truth | Not for |
|-------|-----------------|---------|
| **Neo4j** | Graph: `SourceDocument`, `Claim`, `ClaimConflict`, `CurateAuditEvent`, relationships. Sole persist for Curate mutations _(pre-migration; Claims → D1 per #19)_ | Raw HTML/PDF, job queues, first SSR read |
| **R2** | Blobs + read snapshots (`r2_snapshot_key`, curated inbox/conflicts/map JSON). SSR and Extract jobs **read R2 first** | Approval SoT (always Neo4j pre-migration / D1 post-#19; snapshots are derived) |
| **D1** | Ops/jobs: `discovery_runs`, `extract_jobs` / `classify_jobs`, optional audit copies; **post-#19 also Claim/Source/Conflict/Audit SoT** | Source bodies _(Claim/conflict graph superseded by #19)_ |

Rules:

1. SSR / Overview / Inbox: R2 read-model (future) → isolate TTL → Bolt (hard timeout) → bundled JSON. D1 may feed job badges only.
2. Curate mutation → Neo4j only; then invalidate cache; later async R2 snapshot refresh.
3. Discover / classify / extract jobs → D1 row + R2 body; Rust decides on params; MERGE results into Neo4j.
4. Duplicate inputs: normalized URL / content_hash lists from Neo4j (or R2 snapshot) as params — no URL master in D1.
5. No KV for this path.

Bindings and writers are **follow-up**. Until then, “R2-equivalent” is `apps/web/data/*.json` + schema `r2_snapshot_key`.

## Extract candidate: Jev-style

Primary candidate: [Jev](https://jevcli.vectorz.app/) (`classify` / `extract` / `verify` / `match`).

| Stage | Jev-like | Role |
|-------|----------|------|
| Discover → Inbox | `classify` (+ optional `screen`) | Map source → `evidence_class`; low confidence → `other` / human |
| Inbox duplicate | Rules + optional `match` | Deterministic URL / content_hash first |
| Extract (follow-up) | `extract` + `verify` | Claim fields + excerpt span; always `pending_review` |
| Claim dedupe | fingerprint + optional `match` | Corroboration vs conflict |

Other candidates (fallback): jextract-style locate/pick, sitrep regex, general LLM JSON (last resort).

## Evidence class × confidence (three layers)

Do not conflate:

| Layer | Field | Meaning |
|-------|-------|---------|
| What document | Source `evidence_class` (+ existing `kind`) | intl org / government / academic / news / … |
| When published | Source `published_at` | Article / bulletin post day — **provenance only**, not the fact cut |
| What assertion | Claim fingerprint (`claim_type`, `subject_ref`, `object_value`, `as_of_date`) + Neo4j `claim_category` | Map fact unit; `as_of_date` = in-body “as of …”, **never defaulted from `published_at`**. **One source → many claims** bucketed by category (`aggregate_count`, `case_detail`, …) |
| How much to trust | Claim `confidence` | Dashboard label; **set on human approve** (Extract may only suggest) |

### `evidence_class`

`intl_org` | `national_official` | `academic` | `news` | `travel_advisory` | `ngo_grey` | `other`

Optional later: `evidence_role` = `primary_count | corroboration | background`.

### Confidence (`ConfidenceSchema`)

- `official` — primary official (intl/national) support
- `news_single` — single unofficial / news
- `news_corroborated` — ≥2 **independent** sources, same fingerprint
- `inferred` — derived; not Map primary by default

Same fingerprint across sources = **corroboration**, not conflict. Differing `object_value` for same type/subject/`as_of_date` → `CONFLICTS_WITH`, both visible until resolve. Do not use `published_at` as the conflict or fingerprint key. Exact URL / content_hash → inbox duplicate flag; do not grow claims. Wire-service copies → `possible` dup; exclude from corroboration counts. Sample-driven curator policy (no `resolved_both` for now; article day vs in-body as-of): [`conflict-resolution.md`](./conflict-resolution.md).

**No auto-promote confidence.** Extract/classify return `suggested_confidence` only. Review UI proposes defaults from independent source counts; human approves. Auto-approve stays off in staging and production.

| evidence_class | Typical suggested_confidence | Review priority |
|----------------|------------------------------|-----------------|
| intl_org / national_official | official | High |
| academic | official or inferred | Medium |
| news | news_single → news_corroborated | Medium |
| travel_advisory | official if MoH/WHO else news_single | Border layer |
| ngo_grey / other | news_single or inferred | Low |

## Versioning, audit, rollback (append-only)

Claims are **not overwritten**. Use `review_status: superseded` and `(Claim)-[:SUPERSEDES]->(Claim)`.

| Concept | Meaning |
|---------|---------|
| `lineage_id` | Stable logical claim chain (Map tracks this) |
| Claim node | One immutable version (`version` 1..N) |
| Head | Approved latest for lineage (or `is_head=true`); prior head → `superseded` |
| Public Map | **Approved head only** |

| Operation | Behavior |
|-----------|----------|
| Approve | pending → approved; audit `approve` |
| `reviseClaim` | New pending version; approve supersedes old head |
| `rollbackClaim` | Copy prior payload as new pending version (never delete history); reason required. **Catalog persist** also withdraws the Map head immediately (`superseded` / `is_head=false`) — see [curate-catalog.md](./curate-catalog.md) |
| Reject revision | pending → rejected; head unchanged |
| Extract hits existing lineage | No overwrite; enqueue revision / `needs_revision` (follow-up wiring) |

### `CurateAuditEvent` (Neo4j SoT)

`id`, `at`, `actor`, `action` (`approve` \| `reject` \| `revise` \| `rollback` \| `approve_revision` \| `reject_revision` \| `resolve_conflict` \| `dismiss_source` \| …), `lineage_id`, `claim_id`, `from_version`, `to_version`, `reason`, `payload_digest`. No delete / in-place UPDATE APIs.

Forward-compat: `review_policy.min_approvers` default `1`; multi-approver enforcement is follow-up. Access remains Cloudflare Access email allowlist.

## Curate IA (this issue)

**Two tracks:** Claim (D1) and Case (Neo4j) each have their own Extract→Review→Approve screens — do not share forms. Full IA: [curate-ui.md](./curate-ui.md).

**Claim sidebar (English):** **Overview** → **Inbox** → **Catalog** → **Extract** → **Review** → **Conflicts** → **Status**. Inbox **Adopt** / **Adopt anyway** moves a source into Catalog (`fetched`); **Approve / Reject** apply to claims only (no “Accept”). Overview is the Claim command center; stage pages own detail work. **Catalog** is the post-Adopt home (sources + claim lineages; rollback withdraws Map heads). Review **History** links into Catalog. One-source Claim work: `/curate/source?url=`. Claim Extract is a gated stub; production `EXTRACT_ENABLED` stays false.

**Case sidebar (shell):** **Cases** → **Extract** → **Review** under `/curate/cases/*` — placeholders only in this slice.

Ops **Status** (`/curate/status`) sits below Conflicts. Pipeline stage list and health for that page are owned by `surv_engine` `PIPELINE_SPEC` / `sys.pipelineStatus` — Next only gathers open param bags and renders `stages[]` / `llm[]` / `infra[]`.

## Navara / Map boundary (out of scope)

MapLibre → [Navara](https://github.com/maplibre/navara) is a **separate Map track**. Curate / Extract / storage / versioning do **not** depend on Navara.

1. Navara completion is **not** an acceptance criterion for MATT-310.
2. Curate → Map contract is approved claim heads → MapSnapshot / GeoJSON (future R2). No Navara-specific APIs from Curate or `surv_engine`.
3. Rust `export.geojson` stays generic GIS; Navara adapters live under `apps/web/components/map/*`.

Do not confuse `surv_engine` with Navara’s WASM GIS core — different crates and duties.

## Shared Workers constraint

See [curate-graph-serving.md](./curate-graph-serving.md). Extract backends that need Neo4j use async jobs or snapshot I/O — never unbounded Bolt on the request path.

## Acceptance

- [x] Approved pipeline, storage, Jev candidate, evidence×confidence, versioning documented (this file)
- [x] Schema + `surv_engine` stubs/contracts for classify, duplicate levels, revise/rollback/audit
- [x] Curate shell: flow sidebar, Overview tables, split stage routes, Inbox dup UI, Review History stub
- [ ] Staging may set `EXTRACT_ENABLED=true` for evaluation after backend plug-in lands
- [ ] Production remains `EXTRACT_ENABLED=false` until Extract implementation follow-up

## Out of scope (follow-up)

Jev live wiring, discovery cron, R2/D1 bindings, Extract→`needs_revision` automation, `min_approvers > 1`, full version browser UI, MapLibre→Navara migration.
