# Curate ↔ Map (OSS view)

Curate product (UI, mutate APIs, Access, Extract/Claim specs) lives in private
`diaphana-io/2026bdbv-curate` at `https://2026bdbv.diaphana.io/curate`.

This OSS repo only **consumes** curated outputs for the public Map at `/app`.

## What Map reads

| Source | Used for |
|--------|----------|
| Shared D1 (`bdbv-curate`) | Approved claim aggregates (`case_count`, incidence, …) via `apps/web/lib/d1-queries.ts` → `lib/data.ts` |
| Neo4j Aura | Case / travel / exposure / admin graph for Map layers (`lib/neo4j-queries.ts`) |
| Bundled JSON under `apps/web/data` | Fallback when D1 empty or Neo4j unset |

Writes / Curate UI / Access provisioning are **not** in this tree. Legacy `/app/curate` → 308; `/app/api/curate/*` → 404.
