# Cloudflare Access for `/curate`

Protect human-review UI and Curate APIs. Public Map / Overview stay open.

## Status

Provisioned for production:

- Access app **BDBV Curate** on `2026bdbv.diaphana.io` (four paths below)
- Team domain: `https://tetra4rnav.cloudflareaccess.com`
- Worker `CF_ACCESS_*` values are **text bindings** in [`apps/web/cloudflare.config.ts`](../apps/web/cloudflare.config.ts) (not Wrangler secrets)

## Paths to protect

### Target (Curate Worker seam — Phase 1+)

Curate Worker uses `APP_BASE_PATH=/curate`. Protect the mount (covers UI and `/curate/api/*`):

| Public hostname | Path |
|-----------------|------|
| `2026bdbv.diaphana.io` | `/curate` |
| `2026bdbv.diaphana.io` | `/curate/*` |

Provision: `ACCESS_MOUNT=/curate bash scripts/provision-access-curate.sh` (do not re-run if the app already exists — update destinations in the dashboard instead).

### Legacy (nested under Map Worker `/app`)

| Public hostname | Path |
|-----------------|------|
| `2026bdbv.diaphana.io` | `/app/curate` |
| `2026bdbv.diaphana.io` | `/app/curate/*` |
| `2026bdbv.diaphana.io` | `/app/api/curate` |
| `2026bdbv.diaphana.io` | `/app/api/curate/*` |

Parent and child paths must both be listed: `…/curate/*` does **not** cover `…/curate` ([application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)).

After G2b-oss, the OSS Map Worker has **no** Curate UI/API trees. Legacy `/app/curate` redirects to `/curate` (private Worker) and `/app/api/curate/*` returns 404. Curate mutate + CI live only in `diaphana-io/2026bdbv-curate`.

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

## Prefetch / Neo4j

Access login and Worker JWT middleware must **not** await Neo4j. Graph reads for Curate SSR use a hard Bolt timeout + JSON/stale fallback so a hung Aura connect cannot surface as Error 1101 after Access succeeds — see [`docs/curate-graph-serving.md`](./curate-graph-serving.md) (MATT-314).

## Verify

1. Unauthenticated: `https://2026bdbv.diaphana.io/curate` → Access login (legacy `/app/curate` should 308 → `/curate`).
2. Authenticated curator: Curate UI loads; resolve/dismiss/review APIs succeed (graph persist needs Neo4j secrets separately). Opening Curate must not intermittent-1101 when Aura flaps.
3. Public: `https://2026bdbv.diaphana.io/app/` stays reachable without login (Map). Mutate against `/app/api/curate/*` → 404.
4. After a preview deploy: Access login on preview Curate → no middleware 401 from AUD mismatch.
