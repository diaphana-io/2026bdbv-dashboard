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

# Neo4j
docker compose -f infra/docker-compose.yml up -d

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

See [`docs/remaining-tasks.md`](docs/remaining-tasks.md) for deferred items (Neo4j, Access, Extract issue, Vectorize, discovery cron).

## Git

- Feature branch only; `main` via PR
- Meaningful commits; run `scripts/verify.sh <unit>` before each push
