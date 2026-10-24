# Contributing

## Who this is for

These guidelines are for contributors who clone this repository to run or change the dashboard. They are not required to use the deployed application.

## Before you start

```bash
npm install
npm run dev          # http://127.0.0.1:43127
```

Without `NEO4J_*`, the app serves static JSON under `apps/web/data`. For Aura Free or local Neo4j and seeding, see [`docs/neo4j-aura.md`](docs/neo4j-aura.md).

## Issue tracking

Internal planning lives in the Linear project [2026 BDBV outbreak dashboard](https://linear.app/diaphana/project/2026-bdbv-outbreak-dashboard-12839a73f192/overview) (team **MATT**). Linear is the source of truth for open work.

GitHub Issues on this repository may be used for public discussion. They are intended to sync **one-way into MATT** (GitHub → Linear), not two-way. Prefer linking PRs to the current open items in the tracker; **do not hard-code individual issue identifiers** into README or other durable docs.

To enable sync (Linear workspace admin): **Settings → Features → Integrations → GitHub → GitHub Issues → +**, map `diaphana-io/2026bdbv-dashboard` → team **MATT**, choose **One-way**. See [Linear GitHub Issues sync](https://linear.app/docs/github-to-linear).

## How to contribute

1. Work on a **feature branch** (do not commit directly to `main`).
2. Open a **pull request** targeting `main`.
3. When a change relates to tracked work, **link the relevant issue** in the PR description (see [Issue tracking](#issue-tracking)).

## Checks

Continuous integration runs `bash scripts/verify.sh all` on push and on pull requests to `main` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

Before each push, run the commit-unit gate that matches your change (or `all`):

```bash
bash scripts/verify.sh scaffold   # or schema|engine|curation|all
```

## Product constraints

- **UI language:** English only.
- **Data:** Prefer curated official and news sources; keep unresolved contradictions visible until a human resolves them (see [Data and provenance](README.md#data-and-provenance) in the README).
- **Extract:** Automated extract stays disabled in production until decided through the project’s issue tracker (issue-based gating).
- **Secrets:** Do not commit `.env`, credentials, or other secrets.

## Further documentation

- Deferred work: [`docs/remaining-tasks.md`](docs/remaining-tasks.md)
- Neo4j Aura: [`docs/neo4j-aura.md`](docs/neo4j-aura.md)
- Curate Access: [`docs/cloudflare-access-curate.md`](docs/cloudflare-access-curate.md)
- Security / deploy notes: [`docs/security-deploy.md`](docs/security-deploy.md)
