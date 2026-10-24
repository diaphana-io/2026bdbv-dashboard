# Security and deploy

## Environments

| Env | URL (target) | Extract | Data | Access |
|-----|----------------|---------|------|--------|
| staging | preview Worker | stub (`EXTRACT_ENABLED=false`) | curated + test | Cloudflare Access on `/curate` + `/api/curate` |
| production | `https://2026bdbv.diaphana.io/app` | **blocked until Extract issue resolved** | approved claims only | Cloudflare Access on `/curate` + `/api/curate` |

Production must not ship an automatic Extract backend until [MATT-309](https://linear.app/diaphana/issue/MATT-309/bdbv-extract-backend-specification-blocks-production-extract) is decided (Jev candidates, etc.).

## Cloudflare Access

Protect human-review routes (and matching Curate APIs):

- `/curate`, `/curate/*`
- `/api/curate`, `/api/curate/*`

Full setup: [`docs/cloudflare-access-curate.md`](./cloudflare-access-curate.md)  
Provision helper: `bash scripts/provision-access-curate.sh`

Use Cloudflare Zero Trust Access (email OTP or IdP). Dashboard routes stay public read for Overview/Cases/Map; Access for Curate only.

When `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are set on the Worker, middleware validates `Cf-Access-Jwt-Assertion` as defense in depth.

## Secrets (Wrangler)

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (Aura)
- `EXTRACT_ENABLED=false` until issue closed
- `APP_ENV=staging|production`
- `APP_BASE_PATH=/app` for production on `2026bdbv.diaphana.io` (also set as a Builds build variable)
- `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` after Access app is created
- Optional: Workers AI / Vectorize bindings for measures RAG

## Headers

Enable HTTPS only, security headers via Cloudflare (HSTS, frame deny, nosniff). Do not log PII or secret values.
