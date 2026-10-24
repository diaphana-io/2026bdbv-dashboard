# Agent notes — 2026 BDBV dashboard

Operational conventions for coding agents working in this repository. Human contributor workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Issue tracking (GitHub → Linear)

- **Linear** (team **MATT**, project [2026 BDBV outbreak dashboard](https://linear.app/diaphana/project/2026-bdbv-outbreak-dashboard-12839a73f192/overview)) is the source of truth for open work and priority.
- **GitHub Issues** on `diaphana-io/2026bdbv-dashboard` are for public discussion and may be opened from the repo.
- Sync is **one-way: GitHub Issues → Linear (MATT)** — not two-way. Changes made only in Linear do not write back to GitHub.
- When creating tracker work from this repo, prefer **GitHub Issues** so Linear receives them via sync (they often land in Linear **Triage** until accepted).
- After sync, triage in Linear: set **priority**, move out of Triage (e.g. **Todo**), and attach the **2026 BDBV outbreak dashboard** project if missing.
- Do **not** hard-code individual GitHub or Linear issue IDs into `README.md` or other durable public docs. Short-lived pointers in `docs/remaining-tasks.md` / draft issue docs are OK when they aid current work.
- Link PRs to the relevant tracker item; do not invent parallel issue systems.

Setup (workspace admin): Linear → Settings → Features → Integrations → GitHub → GitHub Issues → map `diaphana-io/2026bdbv-dashboard` → **MATT**, **One-way**. Docs: [Linear GitHub Issues sync](https://linear.app/docs/github-to-linear).

## Suggested post-scaffold priority (Curate path)

Human-curation cutover before automatic Extract:

1. Neo4j Aura Free cutover (graph read/write + Curate persist) — see `docs/neo4j-aura.md`
2. Cloudflare Access for `/app/curate` + `/api/curate` — see `docs/cloudflare-access-curate.md`
3. Extract backend specification (keeps production `EXTRACT_ENABLED=false` until decided) — see `docs/extract-issue.md`

## Product constraints (do not regress)

- UI language: English only.
- Unresolved claim conflicts stay visible until a human resolves them.
- Production Extract stays off until the Extract spec issue is closed with an approved design.
- Never commit secrets (`.env`, Neo4j/Aura/Access credentials).
