# Remaining tasks (post-scaffold)

Intentional or deferred work after the English dashboard + curated dataset land.

## Done in this branch slice

- Curate UI calls `/api/curate/*` for resolve / dismiss / approve|reject (validated; Neo4j-persisted when `NEO4J_*` set)
- `APP_BASE_PATH` for production path `/app` on `2026bdbv.diaphana.io`
- Neo4j driver, `/api/health/neo4j`, curated seed (`npm run seed:neo4j`), async `lib/data` facade with JSON fallback
- aura-cli install docs (`docs/neo4j-aura.md`, `scripts/install-aura-cli.ps1`)
- `scripts/verify.sh all` runs rustfmt + clippy + schema + rust tests + web build
- Cloudflare Access for Curate (Zero Trust app **BDBV Curate** + Worker `CF_ACCESS_*`; preview AUD branched in `cloudflare.config.ts`) — [GitHub #4](https://github.com/diaphana-io/2026bdbv-dashboard/issues/4) / **MATT-312**
- Neo4j Aura Free cutover (instance `bdbv-dashboard` / `928c135c` seeded; Worker `NEO4J_*` secrets; health ok) — [GitHub #3](https://github.com/diaphana-io/2026bdbv-dashboard/issues/3) / **MATT-311**
- Curate graph serving design: hard Bolt timeout + isolate read cache + JSON fallback so Curate SSR cannot 1101 — [`docs/curate-graph-serving.md`](./curate-graph-serving.md) / [GitHub #7](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7) / **MATT-314**

## Still open (human / infra)

1. **Graph modeling completeness** — time-first inventory and checklist in [`docs/graph-model.md`](./graph-model.md) (as-of vs event vs document time; seed gaps for Facility/POE/Lab, DETECTED_IN/RESIDES_IN, CaseSchema date fields).
2. **Extract backend spec** — [GitHub #2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) / synced Linear **MATT-310** (draft in `docs/extract-issue.md`). Keep `EXTRACT_ENABLED=false` in production until then. Shared constraint with Curate: Workers must not hold responses hostage to Bolt ([`docs/curate-graph-serving.md`](./curate-graph-serving.md) / **MATT-314**).
3. **Measures RAG** — replace keyword stand-in with Vectorize / Workers AI when bindings exist.
4. **Map data backlog** — Navara globe + OFM basemaps shipped; remaining DEM / exposure coords / commercial tiles are data needs only — see [`docs/navara-migration.md`](./navara-migration.md).
5. **Source discovery cron** — `data/discovery/queries.json` is config only; Workers cron + R2 snapshot ingest not scheduled yet (R2 curated snapshots also complete the Curate read path in MATT-314).
6. **Production cutover** — full Extract decision still gates automatic extraction; graph-backed dashboard + Access for Curate are in place. After deploy, confirm Curate no longer intermittent-1101s (MATT-314 verify checkbox).
7. **Cori/Rt + incidence API/UI** — estimate Rt from `getIncidenceSeries` (reporting-date caveats); thin API and UI. Tracker: [GitHub #15](https://github.com/diaphana-io/2026bdbv-dashboard/issues/15). Out of scope there: DRC linelist / SI from sitreps alone.
8. **Claim curation SoT → D1** — Phases 0–5 code complete (D1 → JSON; no Neo4j Claim fallback). Remaining ops: manual Aura `DETACH DELETE` after prod D1 verified; optional R2 map dumps; country-stats. Policy: [`docs/claim-d1-migration.md`](./claim-d1-migration.md) / [GitHub #19](https://github.com/diaphana-io/2026bdbv-dashboard/issues/19).

## Out of scope until Extract decision

Automatic claim extraction. Staging may toggle `EXTRACT_ENABLED=true` for evaluation only.
