# `@bdbv/docs`

Public English outbreak-information site (Astro Starlight) for the 2026 BDBV event. Served at `/docs` on Cloudflare Pages.

```bash
# from repo root
npm run dev -w @bdbv/docs
npm run build -w @bdbv/docs
```

Content lives in `src/content/docs/` as hand-authored Markdown/MDX. Do not confuse with repo-root `docs/` (operational notes, unpublished).

Some pages are generated (gitignored) from repo-root Markdown by `scripts/sync-repo-docs.mjs` on `predev` / `prebuild` (or `npm run sync:repo-docs -w @bdbv/docs`). Add a row to `PAGES` in that script; `.gitignore` updates automatically. Edit the repo-root source only — today: [`CONTRIBUTING.md`](../../CONTRIBUTING.md) → `/docs/contributing/`.
