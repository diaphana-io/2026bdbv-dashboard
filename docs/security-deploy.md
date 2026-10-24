# Security and deploy

## Environments

| Env | URL (target) | Extract | Data | Access |
|-----|----------------|---------|------|--------|
| staging / non-`main` | Worker Preview URL (not the production hostname) | stub (`EXTRACT_ENABLED=false`) | Neo4j when `NEO4J_*` set, else curated JSON | Cloudflare Access on `/curate` + `/api/curate` |
| production (`main`) | `https://2026bdbv.diaphana.io/app` | **blocked until Extract issue resolved** | Aura graph when secrets set, else curated JSON | Cloudflare Access on `/curate` + `/api/curate` |

Workers Builds: `main` runs `npm run deploy:ci` → `cf deploy` (production domain). Other branches run the same script, which detects `WORKERS_CI_BRANCH` and runs `cf previews deploy` so the push lands on a Preview URL only.

Production must not ship an automatic Extract backend until [GitHub #2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) (Linear **MATT-310**) is decided (Jev candidates, etc.).

## Cloudflare Access

Protect human-review routes (and matching Curate APIs):

- `/curate`, `/curate/*`
- `/api/curate`, `/api/curate/*`

Full setup: [`docs/cloudflare-access-curate.md`](./cloudflare-access-curate.md)  
Provision helper: `bash scripts/provision-access-curate.sh`

Use Cloudflare Zero Trust Access (email OTP or IdP). Dashboard routes stay public read for Overview/Cases/Map; Access for Curate only.

When `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are set on the Worker, middleware validates `Cf-Access-Jwt-Assertion` as defense in depth.

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
- `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` after Access app is created
- Optional: Workers AI / Vectorize bindings for measures RAG

## Headers

Enable HTTPS only, security headers via Cloudflare (HSTS, frame deny, nosniff). Do not log PII or secret values.
