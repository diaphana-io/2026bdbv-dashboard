/**
 * Deploy the Curate Worker (`bdbv-curate-app`) via the same CI helper as Map,
 * with CURATE_WORKER=1 so cloudflare.config.ts selects /curate triggers.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const result = spawnSync(
  process.execPath,
  [join(webRoot, "scripts", "deploy-ci.mjs")],
  {
    cwd: webRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      CURATE_WORKER: "1",
      CURATE_SURFACE: "1",
      APP_BASE_PATH: "/curate",
    },
  },
);

process.exit(result.status ?? 1);
