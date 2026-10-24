# 2026 BDBV Dashboard

Surveillance dashboard for the 2026 Bundibugyo virus (BDBV) outbreak (NG / KE / UG focus).

- GitHub: [diaphana-io/2026bdbv-dashboard](https://github.com/diaphana-io/2026bdbv-dashboard)
- Origin: [tetra4rnav/2026bdbv-dashboard](https://cursor.com/codebase/tetra4rnav/2026bdbv-dashboard)
- Production target: `https://2026bdbv.diaphana.io/app` (blocked until Extract spec approved; staging only until then)
- UI language: English
- Curate routes: Cloudflare Access (`docs/cloudflare-access-curate.md`)
- Contradictions: show both claims until human resolve

## Stack

- `apps/web` — vinext (Next.js) + Tailwind + shadcn/ui → Cloudflare Workers
- `crates/surv_*` — RustGIS-inspired compute (Session / CommandSpec)
- Neo4j — cases, contacts, follow-up, provenance
- R2 + Vectorize — source snapshots and border-measure RAG

## Local

```bash
# JS
npm install
npm run dev          # http://127.0.0.1:43127

# Neo4j — Aura Free (preferred) or local compose
# Full checklist: docs/neo4j-aura.md
powershell -ExecutionPolicy Bypass -File scripts/install-aura-cli.ps1
# aura-cli credential add … && aura-cli instance create --name bdbv-dashboard --type free-db --await
# Put NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD in apps/web/.env
npm run seed:neo4j
# Optional offline:
# docker compose -f infra/docker-compose.yml up -d

# Without NEO4J_*: dashboard serves static JSON under apps/web/data

# Rust tests
cargo test --workspace

# Commit-unit gate
bash scripts/verify.sh scaffold   # or schema|engine|curation|all
```

## Data policy

- Production: curated real sources (official + news), human-approved claims only
- Tests: `seed/` synthetic (`dataset=test`)
- Extract backend: stub until [MATT-309](https://linear.app/diaphana/issue/MATT-309/bdbv-extract-backend-specification-blocks-production-extract) decision (Jev candidates)
- **UI language: English only**
- **Contradictions**: when sources disagree, both claims stay visible (`CONFLICTS_WITH` / open conflict) until a human resolves (`resolved_a` | `resolved_b` | `resolved_neither`)

## Remaining work

See [`docs/remaining-tasks.md`](docs/remaining-tasks.md) for deferred items (Aura instance cutover, Access, Extract issue, Vectorize, discovery cron). Neo4j wiring: [`docs/neo4j-aura.md`](docs/neo4j-aura.md).

## Git

- Feature branch only; `main` via PR
- Meaningful commits; run `scripts/verify.sh <unit>` before each push
