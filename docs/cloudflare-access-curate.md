# Cloudflare Access for `/curate`

Protect human-review UI and Curate APIs. Public Overview / Cases / Map stay open.

## Paths to protect

Production base path is `/app` (`APP_BASE_PATH`) on host `2026bdbv.diaphana.io`. Access paths must include that prefix.

| Public hostname | Path |
|-----------------|------|
| `2026bdbv.diaphana.io` | `/app/curate` |
| `2026bdbv.diaphana.io` | `/app/curate/*` |
| `2026bdbv.diaphana.io` | `/app/api/curate` |
| `2026bdbv.diaphana.io` | `/app/api/curate/*` |

Parent and child paths must both be listed: `…/curate/*` does **not** cover `…/curate` ([application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)).

For staging Workers / preview hostnames, add the same path pattern under that hostname (or create a second Access application).

## Dashboard setup

1. [Zero Trust](https://one.dash.cloudflare.com/) → **Access controls** → **Applications** → **Add an application** → **Self-hosted**.
2. Name: `BDBV Curate`.
3. **Add public hostname** four times (or one app with multiple domains) using the table above (`diaphana.io` zone → subdomain `2026bdbv`, paths as listed).
4. Create an **Allow** policy, for example:
   - Include → **Emails** → your curator emails, or
   - Include → **Emails ending in** → `@your-org.tld`, or
   - One-time PIN (email OTP) IdP.
5. Save. Open Application → copy **Application Audience (AUD) Tag**.
6. Note your team domain: `https://<team>.cloudflareaccess.com`.

## Worker secrets

Set on the `bdbv-dashboard` Worker (staging + production):

```bash
# example — use Wrangler / dashboard secrets
CF_ACCESS_TEAM_DOMAIN=https://YOUR_TEAM.cloudflareaccess.com
CF_ACCESS_AUD=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APP_ENV=staging   # or production
APP_BASE_PATH=/app
EXTRACT_ENABLED=false
```

When both Access vars are set, middleware validates `Cf-Access-Jwt-Assertion` on `/curate` and `/api/curate/*` (defense in depth). Leave them unset for local `npm run dev`.

## API / script

With `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Access: Apps Edit + Access: Policies Edit):

```bash
bash scripts/provision-access-curate.sh
```

The script creates a reusable Allow policy (email OTP-friendly email list from `ACCESS_ALLOWED_EMAILS`) and a self-hosted app for the four paths. It prints the AUD to put in `CF_ACCESS_AUD`.

## Verify

1. Unauthenticated: `https://2026bdbv.diaphana.io/app/curate` → Access login.
2. Authenticated curator: Curate UI loads; resolve/dismiss APIs succeed.
3. Public: `https://2026bdbv.diaphana.io/app/` and `/app/cases` stay reachable without login.
