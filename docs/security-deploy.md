# Security and deploy

## Environments

| Env | URL (target) | Extract | Data | Access |
|-----|----------------|---------|------|--------|
| staging | preview Worker | stub (`EXTRACT_ENABLED=false`) | curated + test | Cloudflare Access on `/curate` |
| production | `https://www.diaphana.io/2026bdbv/app` | **blocked until Extract issue resolved** | approved claims only | Cloudflare Access on `/curate` |

Production must not ship an automatic Extract backend until the Extract GitHub Issue is decided (Jev candidates, etc.).

## Cloudflare Access

Protect human-review routes:

- `/curate`
- `/curate/*`

Use Cloudflare Zero Trust Access (email OTP or IdP). Dashboard routes may be public or Access-protected per policy; default recommendation: public read for Overview/Cases/Map, Access for Curate.

## Secrets (Wrangler)

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (Aura)
- `EXTRACT_ENABLED=false` until issue closed
- `APP_ENV=staging|production`
- Optional: Workers AI / Vectorize bindings for measures RAG

## Headers

Enable HTTPS only, security headers via Cloudflare (HSTS, frame deny, nosniff). Do not log PII or secret values.
