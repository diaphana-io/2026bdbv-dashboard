# Contributing

## Who this is for

These guidelines are for contributors who clone this repository to run or change the dashboard. They are not required to use the deployed application.

## Before you start

```bash
npm install
npm run dev          # http://127.0.0.1:43127
```

Without `NEO4J_*`, the app serves static JSON under `apps/web/data`. For Aura Free or local Neo4j and seeding, see [`docs/neo4j-aura.md`](docs/neo4j-aura.md).

### Rust toolchain (surv_engine / surv_wasm)

Install [rustup](https://rustup.rs/) so `cargo` is on `PATH` (`%USERPROFILE%\.cargo\bin` on Windows).

**Windows MSVC:** host `cargo test` / `cargo build` / `npm run build:wasm` need `link.exe`. If you see `linker link.exe not found`:

1. Install [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Select workload **Desktop development with C++** (include the MSVC toolset and Windows SDK for your CPU — ARM64 tools on Snapdragon).
3. Open a new terminal (or the **ARM64/x64 Native Tools** prompt) and confirm `where link`.
4. Then: `cargo test -p surv_engine` and `npm run build:wasm`.

Until Build Tools are installed, run the same checks in Docker (Linux image has a linker):

```bash
docker run --rm -v "${PWD}:/app" -w /app rust:1-bookworm cargo test -p surv_engine -p surv_wasm
```

Prebuilt wasm under `apps/web/lib/surv_wasm/` may already be present; regenerate with `npm run build:wasm` after the linker works.

## Issue tracking

Internal planning lives in the Linear project [2026 BDBV outbreak dashboard](https://linear.app/diaphana/project/2026-bdbv-outbreak-dashboard-12839a73f192/overview) (team **MATT**). Linear is the source of truth for open work.

GitHub Issues on this repository may be used for public discussion. They are intended to sync **one-way into MATT** (GitHub → Linear), not two-way. Prefer linking PRs to the current open items in the tracker; **do not hard-code individual issue identifiers** into README or other durable docs.

To enable sync (Linear workspace admin): **Settings → Features → Integrations → GitHub → GitHub Issues → +**, map `diaphana-io/2026bdbv-dashboard` → team **MATT**, choose **One-way**. See [Linear GitHub Issues sync](https://linear.app/docs/github-to-linear).

### Issue labels (area)

Every open GitHub Issue should carry **exactly one** area label so triage can filter Curate vs Map vs everything else:

| Label | Use for |
| --- | --- |
| `curate` | Curate UI/API, Extract, claim SoT (D1), Inbox/Catalog/Review/Conflicts, Cloudflare Access for `/curate` |
| `map` | Public Map / dashboard surface: basemap, layers, incidence series, Rt/Cori, country-stats, map-facing snapshots |
| `other` | Neither Curate nor Map primary: infra, docs-only, CI, cross-cutting work with no clear product surface |

Pick by **primary surface**, not by every phase that touches another system (e.g. a Claim→D1 migration stays `curate` even if a later phase feeds the Map). Combine with type labels when useful (`enhancement`, `bug`, `discussion`, `duplicate`, …). Do not invent parallel area names; add a row here if a new area is needed.

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
