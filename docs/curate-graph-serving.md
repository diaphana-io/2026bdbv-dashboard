# Curate graph serving (Workers + Neo4j)

**GitHub:** [diaphana-io/2026bdbv-dashboard#7](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7) → Linear [MATT-314](https://linear.app/diaphana/issue/MATT-314/bdbv-curate-graph-serving-design-workers-neo4j-avoid-1101)

Separate from Extract / Curate IA design ([#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) / [MATT-310](https://linear.app/diaphana/issue/MATT-310/bdbv-extract-backend-specification-blocks-production-extract) — approved pipeline, Neo4j/R2/D1 split, and `surv_engine` contracts in [extract-issue.md](./extract-issue.md)). Production Extract stays `EXTRACT_ENABLED=false` until that issue’s implementation follow-ups land. This doc unblocks **human curation** on Workers today.

Related: Aura cutover [docs/neo4j-aura.md](./neo4j-aura.md) / [MATT-311](https://linear.app/diaphana/issue/MATT-311/bdbv-neo4j-aura-free-cutover-graph-backed-dashboard-curate-persist). Access: [docs/cloudflare-access-curate.md](./cloudflare-access-curate.md).

## Constraint (shared with Extract)

**Workers must not hold responses hostage to Bolt.** One hung Aura Free connect yields Cloudflare **Error 1101** (`script will never generate a response`). Reducing call frequency alone is not enough.

## Problem

Curate SSR waited on live Neo4j (`Promise.all([getInboxCandidates(), getConflictViews()])`). Aura Free also flaps (`Database <instance> not found` → ok seconds later). Map already fell back to static JSON more readily; Curate did not bound hang time.

## Read / write path

| Path | Source of truth | When Neo4j is touched |
|------|-----------------|------------------------|
| **SSR / public reads** (Map, Overview, Curate inbox/conflicts) | Prefer last good read model: in-isolate TTL cache → live Bolt with hard timeout → stale cache → bundled JSON under `apps/web/data` | Optional; never unbounded |
| **Mutations** (`/api/curate/resolve-conflict`, `dismiss-source`, `review-claim`) | Write **only** to Neo4j when `NEO4J_*` is set; invalidate read cache on success | Required for persist; failures return 503, do not hang HTML |
| **Future R2 snapshot** | Cron / post-mutation export of curated read models to R2; SSR reads snapshot first | Background only |

Target shape: **snapshot-first reads, mutation-only writes.** Today the “snapshot” is the repo JSON seed (and isolate cache of a successful Bolt read). R2 remains deferred with discovery cron ([remaining-tasks](./remaining-tasks.md)).

**R2 / D1 vs Neo4j (Extract pipeline):** Neo4j remains the graph SoT for sources, claims, conflicts, and Curate mutations; R2 holds blobs and derived read snapshots; D1 holds short-lived job/run rows only — full split and rules are in [extract-issue.md §3](./extract-issue.md#3-storage-split-neo4j--r2--d1). Binding and writers stay follow-up.

```text
  Browser / Access
        │
        ▼
  Worker middleware (JWT only — no Neo4j)
        │
        ▼
  Curate RSC / Map SSR
        │
        ├─► graph read cache (TTL, SWR-style)
        ├─► withSession + hard timeout ──► Aura Bolt
        │         │ on timeout / flap
        └─► stale cache or apps/web/data/*.json
```

## Hard timeout + fallback

- `withSession` races Bolt work against `NEO4J_SESSION_TIMEOUT_MS` (default **2500**). On timeout the isolate drops the driver so the session queue can advance.
- `lib/data.ts` `fromNeo4jOrJson` catches timeout/transient errors, serves stale cache when present, else JSON.
- Map behavior for public users is unchanged: still Neo4j-preferred with JSON fallback; it inherits the same timeout envelope.

## Prefetch / Access

- Cloudflare Access gates `/app/curate` and `/app/api/curate/*` at the edge **before** the Worker runs Curate SSR.
- Worker `middleware.ts` validates `Cf-Access-Jwt-Assertion` only — **no Neo4j**.
- Post-login RSC fetch must still settle: hard timeout + JSON fallback so Access success never lands on 1101.

## Env

| Variable | Role |
|----------|------|
| `NEO4J_URI` / `USER` / `PASSWORD` | Aura (or local) Bolt |
| `NEO4J_SESSION_TIMEOUT_MS` | Optional override of hard session ceiling (ms) |
| `NEO4J_READ_CACHE_TTL_MS` | Optional isolate read-cache TTL (default 30000) |

## Acceptance checklist

- [x] Documented read/write path (this file)
- [x] Hard timeout + fallback on graph reads (`lib/neo4j.ts`, `lib/data.ts`)
- [x] Prefetch / Access path does not await Neo4j (`middleware.ts` + timeout on Curate SSR)
- [ ] Production: curator opens Curate without intermittent 1101 (verify after deploy; `verifyConnectivity` must use timed `withSession`, never bare `driver.verifyConnectivity`)
- [x] Extract issue cross-link: shared Bolt constraint ([extract-issue.md](./extract-issue.md))

## Out of scope

- Extract backend choice (MATT-310)
- Access app provisioning (already documented)
- Full Aura checklist beyond neo4j-aura.md / MATT-311
- R2 snapshot writer (follow-up when discovery cron lands)
