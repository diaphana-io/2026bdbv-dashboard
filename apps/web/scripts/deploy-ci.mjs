/**
 * Workers Builds deploy helper.
 *
 * - `main` (production): `cf deploy --prebuilt --mode production`
 * - other branches: `cf previews deploy --mode production` (rebuilds with
 *   isPreview=true so config omits the production domain and gets a Preview URL)
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

const branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  process.env.CI_COMMIT_REF_NAME ||
  "";

// Workers Builds always sets WORKERS_CI_BRANCH. Treat unset as production so a
// local `npm run deploy:ci` after a manual build still deploys production.
const usePreview = Boolean(branch) && branch !== "main";

console.log(
  `[deploy-ci] branch=${branch || "(unset)"} target=${usePreview ? "preview" : "production"}`,
);

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
  // Preview Build Output must be produced with isPreview=true; the CI
  // `npm run build` step is a production build, so preview redeploys from source.
  const args = usePreview
    ? [
        join(cfPkgDir, "bin", "cf"),
        "previews",
        "deploy",
        "--mode",
        "production",
      ]
    : [
        join(cfPkgDir, "bin", "cf"),
        "deploy",
        "--prebuilt",
        "--mode",
        "production",
      ];

  const result = spawnSync(process.execPath, args, {
    cwd: webRoot,
    stdio: "inherit",
    env: process.env,
  });
  status = result.status ?? 1;
} finally {
  writeFileSync(deployInputPath, original);
}

process.exit(status);
