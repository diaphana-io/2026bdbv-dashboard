# Remaining tasks (post-scaffold)

Intentional or deferred work after the English dashboard + curated dataset land.

## Done in this branch slice

- Curate UI calls `/api/curate/*` for resolve / dismiss / approve|reject (validated; Neo4j-persisted when `NEO4J_*` set)
- `APP_BASE_PATH` for production path `/app` on `2026bdbv.diaphana.io`
- Neo4j driver, `/api/health/neo4j`, curated seed (`npm run seed:neo4j`), async `lib/data` facade with JSON fallback
- aura-cli install docs (`docs/neo4j-aura.md`, `scripts/install-aura-cli.ps1`)
- `scripts/verify.sh all` runs rustfmt + clippy + schema + rust tests + web build

## Still open (human / infra)

1. **Extract backend spec** — [MATT-309](https://linear.app/diaphana/issue/MATT-309/bdbv-extract-backend-specification-blocks-production-extract) (draft in `docs/extract-issue.md`). Keep `EXTRACT_ENABLED=false` in production until then.
2. **Aura Free instance cutover** — create with aura-cli (needs API client credentials), set Worker secrets, run `npm run seed:neo4j`, confirm `/api/health/neo4j` and `/app` read/write against the graph (`docs/neo4j-aura.md`).
3. **Cloudflare Access** — code + docs ready (`docs/cloudflare-access-curate.md`); create/update the Zero Trust app for `2026bdbv.diaphana.io` paths; confirm `CF_ACCESS_*` on the Worker.
4. **Measures RAG** — replace keyword stand-in with Vectorize / Workers AI when bindings exist.
5. **Map tiles** — optional MapLibre once a token/tileset is available (SVG projection is intentional for now).
6. **Source discovery cron** — `data/discovery/queries.json` is config only; Workers cron + R2 snapshot ingest not scheduled yet.
7. **Production cutover** — full Extract decision still gates automatic extraction; graph-backed dashboard can go live once Aura secrets + Access are set.

## Out of scope until Extract decision

Automatic claim extraction. Staging may toggle `EXTRACT_ENABLED=true` for evaluation only.
