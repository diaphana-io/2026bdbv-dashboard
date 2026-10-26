# Map floating panels

## Contract

| Concern | Rule |
| --- | --- |
| Shell | shadcn `Card` (`CardHeader` / `CardTitle` / `CardAction` close / `CardContent`) |
| Move / resize | `react-rnd` wrapping the Card; drag from the header |
| Defaults | `defaults.ts` — `defaultOpen`, `defaultPosition`, `defaultSize` per `PanelId` |
| Bounds | Clamp to `PanelHost` inset (map viewport) |
| Close | Header X → `setPanelOpen(id, false)` |
| Focus | Pointer down → raise z-index via `focusPanel` |
| Accent | Optional `accentColor` on `PanelFrame` (CSS border) — not a nested Card |
| Content | Children only inside `CardContent`; no second card wrappers |
| Persist | Position/size written to localStorage only when **Save Panel Positions in Browser** is checked; **Reset Panel Positions** restores defaults |

Add a panel: one body component + one `PANEL_REGISTRY` entry + defaults in `defaults.ts`.
