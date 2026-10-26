# Map floating panels

## Contract

| Concern | Rule |
| --- | --- |
| Shell | Lightweight chrome (header + body); not a nested shadcn Card |
| Move / resize | `react-rnd`; drag from the header (`.panel-drag-handle`) |
| Defaults | `defaults.ts` — `defaultOpen`, `defaultPosition`, `defaultSize` per `PanelId` |
| Bounds | Clamp to `PanelHost` inset (map viewport); out-of-bounds positions corrected on mount |
| Close | Header X → `setPanelOpen(id, false)` |
| Focus | Pointer down → raise z-index via `focusPanel` |
| Accent | Optional `accentColor` tints header and left edge (country flag color) |
| Content | Children only inside the body region |
| Persist | Position/size written to localStorage only when **Save Panel Positions in Browser** is checked; **Reset Panel Positions** restores defaults |

Add a panel: one body component + one `PANEL_REGISTRY` entry + defaults in `defaults.ts`.
