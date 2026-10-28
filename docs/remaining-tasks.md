# Remaining tasks (post-scaffold)

Intentional or deferred work after the English dashboard + curated dataset land.

## Done in this branch slice

- `APP_BASE_PATH` for production path `/app` on `2026bdbv.diaphana.io`
- Neo4j driver, `/api/health/neo4j`, curated seed (`npm run seed:neo4j`), async `lib/data` facade with JSON fallback
- aura-cli install docs (`docs/neo4j-aura.md`, `scripts/install-aura-cli.ps1`)
- `scripts/verify.sh all` runs rustfmt + clippy + schema + rust tests + web build
- Neo4j Aura Free cutover — [GitHub #3](https://github.com/diaphana-io/2026bdbv-dashboard/issues/3) / Linear **BDBV-4**
- Public Map / private Curate split — [GitHub #54](https://github.com/diaphana-io/2026bdbv-dashboard/issues/54); Curate docs → private repo ([`docs/curate.md`](./curate.md))

## Still open (human / infra)

Tracker: Linear team **BDBV**. Curate Issues live on private `2026bdbv-curate`; Map Issues on this repo.

1. **Graph modeling completeness** — [`docs/graph-model.md`](./graph-model.md)
2. **Extract backend** — [curate#6](https://github.com/diaphana-io/2026bdbv-curate/issues/6) / Linear **BDBV-16** (spec in private Curate repo). Keep `EXTRACT_ENABLED=false` in production until then. Workers must not hold responses hostage to Bolt.
3. **Measures RAG** — Vectorize / Workers AI when bindings exist.
4. **Map data backlog** — [`docs/navara-migration.md`](./navara-migration.md)
5. **Source discovery cron** — [curate#10](https://github.com/diaphana-io/2026bdbv-curate/issues/10) / **BDBV-17**
6. **Cori/Rt + incidence API/UI** — [GitHub #15](https://github.com/diaphana-io/2026bdbv-dashboard/issues/15) / **BDBV-20**
7. **Phase 3 harden** — parent [dashboard#61](https://github.com/diaphana-io/2026bdbv-dashboard/issues/61); R2 write [curate#13](https://github.com/diaphana-io/2026bdbv-curate/issues/13); Map R2 reads [#63](https://github.com/diaphana-io/2026bdbv-dashboard/issues/63)

## Out of scope until Extract decision

Automatic claim extraction. Staging may toggle `EXTRACT_ENABLED=true` for evaluation only.
