# Cloudflare Access for `/curate`

Protect human-review UI and Curate APIs. Public Map / Overview stay open.

## Status

Provisioned for production:

- Access app **BDBV Curate** on `2026bdbv.diaphana.io` (four paths below)
- Team domain: `https://tetra4rnav.cloudflareaccess.com`
- Worker `CF_ACCESS_*` values are **text bindings** in [`apps/web/cloudflare.config.ts`](../apps/web/cloudflare.config.ts) (not Wrangler secrets)

## Paths to protect

Production base path is `/app` (`APP_BASE_PATH`) on host `2026bdbv.diaphana.io`. Access paths must include that prefix.

| Public hostname | Path |
|-----------------|------|
| `2026bdbv.diaphana.io` | `/app/curate` |
| `2026bdbv.diaphana.io` | `/app/curate/*` |
| `2026bdbv.diaphana.io` | `/app/api/curate` |
| `2026bdbv.diaphana.io` | `/app/api/curate/*` |

Parent and child paths must both be listed: `…/curate/*` does **not** cover `…/curate` ([application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)).

## Preview / staging

Worker Previews use a separate Access app (**bdbv-dashboard - Cloudflare Workers**, `preview_worker` destination) that gates the whole preview URL. That app has a different Application Audience (AUD) than **BDBV Curate**.

`cloudflare.config.ts` sets `CF_ACCESS_AUD` from `isPreview`:

- Production → BDBV Curate AUD (path-scoped)
- Preview → Workers Preview Access AUD (whole-preview gate)

Path-scoped mirroring on ephemeral preview hostnames is not used. Leave `CF_ACCESS_*` unset for local `npm run dev`.

## Dashboard setup (reference)

1. [Zero Trust](https://one.dash.cloudflare.com/) → **Access controls** → **Applications** → **Add an application** → **Self-hosted**.
2. Name: `BDBV Curate`.
3. **Add public hostname** four times (or one app with multiple domains) using the table above (`diaphana.io` zone → subdomain `2026bdbv`, paths as listed).
4. Create an **Allow** policy, for example:
   - Include → **Emails** → your curator emails, or
   - Include → **Emails ending in** → `@your-org.tld`, or
   - One-time PIN (email OTP) IdP.
5. Save. Open Application → copy **Application Audience (AUD) Tag**.
6. Note your team domain: `https://<team>.cloudflareaccess.com`.
7. Put team domain + AUD in `apps/web/cloudflare.config.ts` as text bindings (branch preview AUD if using Workers Preview Access).

Also confirm `APP_ENV`, `APP_BASE_PATH=/app`, and `EXTRACT_ENABLED=false` as appropriate.

## API / script

With `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Access: Apps Edit + Access: Policies Edit):

```bash
bash scripts/provision-access-curate.sh
```

The script creates a reusable Allow policy (email OTP-friendly email list from `ACCESS_ALLOWED_EMAILS`) and a self-hosted app for the four paths. It prints the AUD for `CF_ACCESS_AUD`. Do **not** re-run if **BDBV Curate** already exists (duplicates the app).

## Verify

1. Unauthenticated: `https://2026bdbv.diaphana.io/app/curate` → Access login.
2. Authenticated curator: Curate UI loads; resolve/dismiss/review APIs succeed (graph persist needs Neo4j secrets separately).
3. Public: `https://2026bdbv.diaphana.io/app/` stays reachable without login (Map). There is no `/app/cases` route today.
4. After a preview deploy: Access login on preview Curate → no middleware 401 from AUD mismatch.
