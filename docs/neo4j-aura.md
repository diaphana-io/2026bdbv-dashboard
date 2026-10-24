# Neo4j Aura + local graph

Production graph lives on **Neo4j Aura Free**. Local Docker Compose is optional for offline work.

## Install aura-cli (Windows)

Latest release: https://github.com/neo4j/aura-cli/releases/latest

```powershell
# Or use the helper (downloads v1.9.1 x86_64 into %LOCALAPPDATA%\neo4j-aura-cli):
powershell -ExecutionPolicy Bypass -File scripts/install-aura-cli.ps1

# Manual:
# 1. Download aura-cli_*_Windows_x86_64.zip
# 2. Expand to a folder on PATH (e.g. %LOCALAPPDATA%\neo4j-aura-cli)
# 3. Confirm:
aura-cli -v
```

Do not commit the binary into this repo.

## Aura API credentials

1. Open [Aura Account → Client credentials](https://console.neo4j.io/#account).
2. Create a client credential; save **Client ID** and **Client Secret** (secret shown once).
3. Payment method may be required on the account even for Free API use.

```powershell
aura-cli credential add --name bdbv --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
aura-cli instance list --output table
```

## Create Free instance

```powershell
aura-cli instance create --name bdbv-dashboard --type free-db --await
```

Save the printed **URI** (`neo4j+s://…`), **username**, and **password** immediately (password is not shown again).

Console alternative: https://console.neo4j.io/ → Create → Free → same connection fields.

## Wire secrets (never commit)

Local (`apps/web/.env`, gitignored):

```env
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

Local Compose (optional):

```env
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=bdbvlocal
```

```bash
docker compose -f infra/docker-compose.yml up -d
```

Cloudflare Worker `bdbv-dashboard` secrets (dashboard or Wrangler): `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.

If these are unset, the web app keeps serving static JSON under `apps/web/data` (Workers cannot reach localhost Neo4j).

## Seed + health

```bash
npm run seed:neo4j
# then with the app running:
curl -s http://127.0.0.1:43127/api/health/neo4j
```

Expect `{ "ok": true, "configured": true }` when Aura/local credentials work.

## Checklist

1. aura-cli installed and `aura-cli -v` works
2. API credential added; `instance list` works
3. Free instance `bdbv-dashboard` running
4. `.env` + Worker secrets set
5. `seed:neo4j` against Aura
6. `/api/health/neo4j` ok; dashboard reads / Curate writes persist
