#!/usr/bin/env bash
# Provision Cloudflare Access self-hosted app for BDBV Curate paths.
#
# Requires:
#   CLOUDFLARE_ACCOUNT_ID
#   CLOUDFLARE_API_TOKEN   (Access: Apps Edit, Access: Policies Edit)
# Optional:
#   ACCESS_HOSTNAME        (default: 2026bdbv.diaphana.io)
#   ACCESS_BASE_PATH       (default: /app)
#   ACCESS_ALLOWED_EMAILS  (comma-separated curator emails)
#   ACCESS_APP_NAME        (default: BDBV Curate)
#
# See docs/cloudflare-access-curate.md
set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
TOKEN="${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
HOSTNAME="${ACCESS_HOSTNAME:-2026bdbv.diaphana.io}"
BASE_PATH="${ACCESS_BASE_PATH:-/app}"
APP_NAME="${ACCESS_APP_NAME:-BDBV Curate}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}"

auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

PATHS="$(printf '%s\n' \
  "${BASE_PATH}/curate" \
  "${BASE_PATH}/curate/*" \
  "${BASE_PATH}/api/curate" \
  "${BASE_PATH}/api/curate/*")"

payload=$(
  HOSTNAME="$HOSTNAME" \
  APP_NAME="$APP_NAME" \
  PATHS="$PATHS" \
  ACCESS_ALLOWED_EMAILS="${ACCESS_ALLOWED_EMAILS:-}" \
  python3 - <<'PY'
import json, os

hostname = os.environ["HOSTNAME"]
paths = [p for p in os.environ["PATHS"].split("\n") if p]
emails = [e.strip() for e in os.environ.get("ACCESS_ALLOWED_EMAILS", "").split(",") if e.strip()]
include = [{"email": {"email": e}} for e in emails] or [{"everyone": {}}]
destinations = [{"type": "public", "uri": f"https://{hostname}{p}"} for p in paths]

print(json.dumps({
  "policy": {
    "name": "BDBV Curate allow",
    "decision": "allow",
    "include": include,
    "exclude": [],
    "require": [],
  },
  "app": {
    "name": os.environ["APP_NAME"],
    "type": "self_hosted",
    "destinations": destinations,
    "session_duration": "24h",
    "auto_redirect_to_identity": False,
  },
}))
PY
)

policy_body=$(python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["policy"]))' <<<"$payload")
app_template=$(python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["app"]))' <<<"$payload")

if [[ -z "${ACCESS_ALLOWED_EMAILS:-}" ]]; then
  echo "WARN: ACCESS_ALLOWED_EMAILS unset — policy uses everyone (tighten in dashboard)." >&2
fi

echo "==> Creating reusable Access policy…"
policy_res=$(curl -sS "${auth[@]}" -X POST "${API}/access/policies" --data "$policy_body")
policy_id=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("result") or {}).get("id") or "")' <<<"$policy_res")
if [[ -z "$policy_id" ]]; then
  echo "Failed to create policy:" >&2
  echo "$policy_res" >&2
  exit 1
fi
echo "Policy id: $policy_id"

app_body=$(
  POLICY_ID="$policy_id" APP_JSON="$app_template" python3 - <<'PY'
import json, os
app = json.loads(os.environ["APP_JSON"])
app["policies"] = [{"id": os.environ["POLICY_ID"]}]
print(json.dumps(app))
PY
)

echo "==> Creating Access application…"
app_res=$(curl -sS "${auth[@]}" -X POST "${API}/access/apps" --data "$app_body")
ok=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("success"))' <<<"$app_res")
aud=$(python3 -c 'import json,sys; r=(json.load(sys.stdin).get("result") or {}); print(r.get("aud") or "")' <<<"$app_res")
if [[ "$ok" != "True" && "$ok" != "true" ]]; then
  echo "Failed to create application:" >&2
  echo "$app_res" >&2
  exit 1
fi

echo
echo "Access application created for:"
echo "$PATHS" | sed "s|^|  https://${HOSTNAME}|"
echo
echo "Set Worker secrets:"
echo "  CF_ACCESS_TEAM_DOMAIN=https://<your-team>.cloudflareaccess.com"
echo "  CF_ACCESS_AUD=${aud}"
