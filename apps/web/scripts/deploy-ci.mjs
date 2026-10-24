/**
 * Workers Builds deploy helper.
 *
 * `cf deploy` hardcodes `strict: true`, which aborts in CI when the Worker was
 * last updated via the script API (e.g. secrets patched outside `cf deploy`).
 * Soften that for Builds so an intentional production upload can proceed.
 */
import { createRequire } from "node:module";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cfPkgDir = dirname(require.resolve("cf/package.json"));
const distDir = join(cfPkgDir, "dist");
const deployInput = readdirSync(distDir).find(
  (name) => name.startsWith("deploy-input-") && name.endsWith(".mjs"),
);

if (!deployInput) {
  console.error("Could not find cf deploy-input module under", distDir);
  process.exit(1);
}

const deployInputPath = join(distDir, deployInput);
const original = readFileSync(deployInputPath, "utf8");
if (!original.includes("strict:!0")) {
  console.error(
    "cf deploy-input no longer hardcodes strict:!0; update apps/web/scripts/deploy-ci.mjs",
  );
  process.exit(1);
}

writeFileSync(deployInputPath, original.replaceAll("strict:!0", "strict:!1"));

let status = 1;
try {
  const result = spawnSync(
    process.execPath,
    [join(cfPkgDir, "bin", "cf"), "deploy", "--prebuilt", "--mode", "production"],
    {
      cwd: webRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
  status = result.status ?? 1;
} finally {
  writeFileSync(deployInputPath, original);
}

process.exit(status);
