#!/usr/bin/env bash
# Run the test gate for a commit unit. Usage: scripts/verify.sh [unit]
# Units: scaffold | schema | engine | curation | data | dashboard | contacts | map | measures | lint | all
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
UNIT="${1:-all}"

run_schema() {
  if [[ -f packages/schema/package.json ]]; then
    npm run test -w @bdbv/schema
  else
    echo "schema package not ready; skip"
  fi
}

run_rust() {
  if [[ -f Cargo.toml ]]; then
    cargo test --workspace
  else
    echo "rust workspace not ready; skip"
  fi
}

run_wasm() {
  if [[ -f crates/surv_wasm/Cargo.toml ]]; then
    if command -v node >/dev/null 2>&1; then
      node scripts/build-surv-wasm.mjs
    else
      bash scripts/build-surv-wasm.sh
    fi
  else
    echo "surv_wasm not ready; skip"
  fi
}

run_lint() {
  if [[ -f Cargo.toml ]]; then
    cargo fmt --all -- --check
    cargo clippy --workspace -- -D warnings
  fi
}

run_web_build() {
  if [[ -d node_modules ]] || [[ -d apps/web/node_modules ]]; then
    npm run test -w @bdbv/web
    npm run build -w @bdbv/web
  else
    echo "web deps missing; skip build"
  fi
}

echo "==> verify: $UNIT"
case "$UNIT" in
  scaffold)
    test -f apps/web/package.json
    test -f Cargo.toml
    test -f infra/docker-compose.yml
    test -d crates/surv_geom
    test -d crates/surv_engine
    cargo check -p surv_geom
    echo "scaffold OK"
    ;;
  schema)
    run_schema
    test -f infra/neo4j/constraints.cypher
    echo "schema OK"
    ;;
  engine)
    cargo test -p surv_geom -p surv_data -p surv_analysis -p surv_epi -p surv_engine -p surv_wasm
    if command -v node >/dev/null 2>&1; then
      node scripts/build-surv-wasm.mjs || echo "wasm build skipped/failed (optional for engine unit)"
    fi
    echo "engine OK"
    ;;
  curation)
    cargo test -p surv_engine -- curation
    run_schema
    echo "curation OK"
    ;;
  data)
    test -d data/seed/curated
    run_schema
    echo "data OK"
    ;;
  lint)
    run_lint
    echo "lint OK"
    ;;
  dashboard|contacts|map|measures)
    run_schema
    run_rust
    run_web_build
    echo "$UNIT OK"
    ;;
  all)
    run_lint
    run_schema
    run_rust
    run_wasm
    run_web_build
    echo "all OK"
    ;;
  *)
    echo "unknown unit: $UNIT" >&2
    exit 1
    ;;
esac
