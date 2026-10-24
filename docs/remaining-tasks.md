# Remaining tasks (post-scaffold)

Intentional or deferred work after the English dashboard + curated dataset land.

## Done in this branch slice

- Curate UI calls `/api/curate/*` for resolve / dismiss / approve|reject (validated; not Neo4j-persisted yet)
- `APP_BASE_PATH` for production path `/2026bdbv/app`
- `scripts/verify.sh all` runs rustfmt + clippy + schema + rust tests + web build

## Still open (human / infra)

1. **Extract backend spec** — [MATT-309](https://linear.app/diaphana/issue/MATT-309/bdbv-extract-backend-specification-blocks-production-extract) (draft in `docs/extract-issue.md`). Keep `EXTRACT_ENABLED=false` in production until then.
2. **Neo4j persistence** — wire Aura / local compose so Curate mutations and dashboard reads use the graph (today: static JSON under `apps/web/data` + `data/curated`).
3. **Cloudflare Access** — code + docs ready (`docs/cloudflare-access-curate.md`); create the Zero Trust app / set `CF_ACCESS_*` secrets on the deployed Worker (needs account API token or dashboard).
4. **Measures RAG** — replace keyword stand-in with Vectorize / Workers AI when bindings exist.
5. **Map tiles** — optional MapLibre once a token/tileset is available (SVG projection is intentional for now).
6. **Source discovery cron** — `data/discovery/queries.json` is config only; Workers cron + R2 snapshot ingest not scheduled yet.
7. **Production cutover** — `https://www.diaphana.io/2026bdbv/app` blocked until Extract issue is decided.

## Out of scope until Extract decision

Automatic claim extraction. Staging may toggle `EXTRACT_ENABLED=true` for evaluation only.
