# `apps/web/components`

Top-level layout of UI modules:

| Folder / file | Purpose |
| --- | --- |
| `map/` | Public outbreak map shell, sidebar, layers, and floating panels |
| `curate/` | Curate console shell, sidebar, tables, and conflict UI |
| `shared/` | App chrome shared by Map and Curate (AppShell, BrandLink, ModeToggle, AppNav) |
| `layout/` | Shared `AppSidebar` chrome (header/footer/rail) used by both sidebars |
| `ui/` | shadcn/ui primitives only |
| `archive/` | Unmounted stubs kept for possible restore — not part of the live UI |
| `theme-provider.tsx` | App-wide theme provider (stays at components root) |

## Rules

- `ui/` = shadcn primitives; do not put product domain logic here.
- `shared/` = app chrome reused across modes.
- Domain code stays under `map/` or `curate/` (including `map/panels/` and `curate/conflicts/`).

## Archive

`archive/` is **not** mounted in the live UI. Keep entries here so they can be restored later.

Current entry:

- `archive/metrics/` — `MetricPanel` stub (was unmounted pending metrics returning to the public UI).

Do not import archive modules from app routes unless intentionally reviving them.
