# Security and deploy

## Environments

| Env | URL (target) | Extract | Data | Access |
|-----|----------------|---------|------|--------|
| staging / non-`main` | Worker Preview URL (not the production hostname) | stub (`EXTRACT_ENABLED=false`) | Neo4j when `NEO4J_*` set, else curated JSON | Map public; Curate Access private |
| production (`main`) | `https://2026bdbv.diaphana.io/app` | **blocked until Extract issue resolved** | Aura graph when secrets set, else curated JSON | Map public; Curate Access private |

Workers Builds: `main` runs `npm run deploy:ci` → `cf deploy` (production domain). Other branches run the same script, which detects `WORKERS_CI_BRANCH` and runs `cf previews deploy` so the push lands on a Preview URL only.

Production must not ship an automatic Extract backend until decided (Linear **MATT-310** / private Curate Extract docs).

## Cloudflare Access

Curate Access lives in private `diaphana-io/2026bdbv-curate`. Existence only: [`docs/curate.md`](./curate.md).

Public Map `/app` stays open.

## Neo4j / Aura

Create Free instance, seed, and wire secrets: [`docs/neo4j-aura.md`](./neo4j-aura.md).

- Health: `GET /api/health/neo4j`
- Seed: `npm run seed:neo4j` (against Aura or local compose)
- Without secrets the Worker keeps serving `apps/web/data` JSON (Workers cannot reach localhost Neo4j)

## Secrets (Worker / Wrangler)

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (Aura `neo4j+s://…`) — declared as secrets in `cloudflare.config.ts`
- `EXTRACT_ENABLED=false` until issue closed
- `APP_ENV=staging|production`
- `APP_BASE_PATH=/app` on the Worker (runtime) — production `vite build` defaults to `/app` when unset
- Worker routes (not a Custom Domain): `2026bdbv.diaphana.io/app` and `2026bdbv.diaphana.io/app/*` → `bdbv-dashboard`. Other host paths (e.g. `/docs`) are free for Cloudflare Pages. Keep a proxied originless DNS record (`AAAA 100::`) for `2026bdbv.diaphana.io`.
- Cloudflare Single Redirect: `2026bdbv.diaphana.io/` → `https://2026bdbv.diaphana.io/app` (`http_request_dynamic_redirect`; also mirrored in `apps/web/next.config.ts` as a non-production fallback)
- Optional: `CF_ACCESS_*` defense-in-depth; Curate Access config is private
- Optional: Workers AI / Vectorize bindings for measures RAG

## Headers

Enable HTTPS only, security headers via Cloudflare (HSTS, frame deny, nosniff). Do not log PII or secret values.
