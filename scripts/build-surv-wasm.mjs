#!/usr/bin/env node
/**
 * Build surv_wasm → apps/web/lib/surv_wasm (wasm-pack, bundler target).
 * Requires rustup + wasm32-unknown-unknown; installs wasm-pack if missing.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps", "web", "lib", "surv_wasm");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function hasCmd(cmd) {
  const r = spawnSync(cmd, ["--version"], {
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  return r.status === 0;
}

if (!hasCmd("rustup") || !hasCmd("cargo")) {
  console.error("rustup/cargo required on PATH (%USERPROFILE%\\.cargo\\bin on Windows)");
  process.exit(1);
}

// Host build-scripts still need a native linker (MSVC link.exe on Windows).
// See CONTRIBUTING.md → "Rust toolchain" if you get linker `link.exe` not found.

run("rustup", ["target", "add", "wasm32-unknown-unknown"]);

if (!hasCmd("wasm-pack")) {
  console.log("wasm-pack not found; installing via cargo…");
  run("cargo", ["install", "wasm-pack", "--locked"]);
}

// Absolute --out-dir: wasm-pack resolves relative paths from the crate dir.
run("wasm-pack", [
  "build",
  join(root, "crates", "surv_wasm"),
  "--target",
  "bundler",
  "--out-dir",
  out,
  "--out-name",
  "surv_wasm",
  "--release",
]);

for (const f of ["package.json", ".gitignore", "README.md"]) {
  const p = join(out, f);
  if (existsSync(p)) rmSync(p);
}

console.log(`surv_wasm → ${out}`);
