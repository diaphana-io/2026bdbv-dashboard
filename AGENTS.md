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

## Suggested post-scaffold priority

1. Neo4j Aura / Map reads — see `docs/neo4j-aura.md`
2. Extract remains off in production (`EXTRACT_ENABLED=false`) until decided in Linear / private Curate docs
3. Map product work on this OSS repo only

**Repo split:** this tree is Map / public reads (`/app`). Curate exists at `/curate` in private `diaphana-io/2026bdbv-curate` — see [`docs/curate.md`](docs/curate.md). Do not re-add Curate UI/API or write helpers here.

## Commit messages

Keep messages **very short**: two lines, ~120 characters total (no bullet changelogs).

```text
<type>: <topic>

<why>
```

- **type**: `feat` | `fix` | `docs` | `refactor` | `test` | `chore` | `perf` | `ci`
- **topic**: 2–5 words, area only — no verbs like `update`/`add`, no file dumps
- **why**: one short sentence on purpose, not a list of edits

Example: `refactor: thin basemap style` then `Shrink style payload so the map paints sooner.`

**Where the rule lives**

| Consumer | Source |
| --- | --- |
| Agents / chat | `.cursor/rules/commit-messages.mdc` (+ this section) |
| Source Control **Generate Commit Message** (sparkles) | repo-root `.cursorrules` only |

Cursor does not apply Project Rules or AGENTS.md to the sparkles button; keep `.cursorrules` aligned with the format above.

## UI components (shadcn/ui first)

- Before adding or inventing a UI control, **check whether [shadcn/ui](https://ui.shadcn.com) already provides it** (Spinner, Skeleton, Button, Dialog, Sheet, etc.).
- Prefer installing / using the shadcn component (under `apps/web/components/ui/`) over a one-off custom implementation.
- **Do not hand-roll** loading indicators, skeletons, buttons, badges, cards, tables, or similar primitives when a shadcn equivalent exists or can be added with the shadcn CLI.
- Match the existing `apps/web/components/ui/*` patterns (Tailwind, same visual language) when adding a shadcn component.

## Product constraints (do not regress)

- UI language: English only.
- Unresolved claim conflicts stay visible until a human resolves them.
- Production Extract stays off until the Extract spec issue is closed with an approved design.
- Never commit secrets (`.env`, Neo4j/Aura/Access credentials).
