# `apps/web/components`

Top-level layout of UI modules:

| Folder / file | Purpose |
| --- | --- |
| `map/` | Public outbreak map shell, floating sidebar, layers, and panels |
| `shared/` | App chrome for the Map Worker (AppShell, BrandLink, ModeToggle, AppNav) |
| `ui/` | shadcn/ui primitives only |
| `archive/` | Unmounted stubs kept for possible restore — not part of the live UI |
| `theme-provider.tsx` | App-wide theme provider (stays at components root) |

Curate UI lives in private `diaphana-io/2026bdbv-curate` — do not re-add `components/curate/` here.

## Rules

- `ui/` = shadcn primitives; do not put product domain logic here.
- `shared/` = app chrome for the public Map surface.
- Domain map code stays under `map/` (including `map/panels/`).
- Map sidebar uses shadcn `variant="floating"`.

## Archive

`archive/` is **not** mounted in the live UI. Keep entries here so they can be restored later.

Current entry:

- `archive/metrics/` — `MetricPanel` stub (was unmounted pending metrics returning to the public UI).

Do not import archive modules from app routes unless intentionally reviving them.
