#!/usr/bin/env bash
# Build surv_wasm for Vite / Workers import into apps/web/lib/surv_wasm.
# Prefer: npm run build:wasm (node scripts/build-surv-wasm.mjs)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/apps/web/lib/surv_wasm"

rustup target add wasm32-unknown-unknown >/dev/null
if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found; installing..."
  cargo install wasm-pack --locked
fi

mkdir -p "$OUT"
# Absolute --out-dir: wasm-pack resolves relative paths from the crate dir.
wasm-pack build "$ROOT/crates/surv_wasm" \
  --target bundler \
  --out-dir "$OUT" \
  --out-name surv_wasm \
  --release

rm -f "$OUT/package.json" "$OUT/.gitignore" "$OUT/README.md"

echo "surv_wasm → $OUT"
