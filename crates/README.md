# Crates (`surv_*`)

Cargo workspace members (`crate` = Rust package). Curate command logic lives in `surv_engine`; the WASM bridge is `surv_wasm`.

| Crate | Role |
| --- | --- |
| `surv_geom` | L0 coords / extents |
| `surv_data` | L1 features / GeoJSON |
| `surv_analysis` | L2 PIP / admin counts |
| `surv_epi` | Epi curve / follow-up / CFR |
| `surv_engine` | Session + `curate.*` / `sys.pipelineStatus` |
| `surv_wasm` | wasm-bindgen → Workers / Vite |

## Dev

```bash
cargo test --workspace
npm run build:wasm
```

Command contracts for Extract / Curate: [`docs/extract-issue.md`](../docs/extract-issue.md).
