import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
// Explicit .ts extension: Workers Builds loads this file via Node ESM.
import {
  APP_WORKER_FETCH_PATTERNS,
  CURATE_WORKER_FETCH_PATTERNS,
} from "./lib/worker-routes.ts";

/**
 * Dual Worker seam (still one git repo):
 *
 * - Default / Map: `bdbv-dashboard` at `/app` (`npm run build`)
 * - Curate: set `CURATE_WORKER=1` → `bdbv-curate-app` at `/curate`
 *   (`npm run build:curate`)
 *
 * Production Map: https://2026bdbv.diaphana.io/app
 * Production Curate: https://2026bdbv.diaphana.io/curate
 *
 * Non-main branches use `cf previews deploy` (Worker Previews).
 *
 * APP_BASE_PATH must also be set as a Workers Builds *build* variable so
 * next.config.ts picks it up at compile time.
 *
 * Apex `/` → `/app` stays a zone Single Redirect (not this Worker).
 */
const curateWorker = process.env.CURATE_WORKER === "1";

export default defineConfig(({ isPreview }) => ({
  worker: defineWorker({
    name: curateWorker ? "bdbv-curate-app" : "bdbv-dashboard",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: false,
    previewUrls: true,
    triggers: isPreview
      ? []
      : (curateWorker
          ? CURATE_WORKER_FETCH_PATTERNS
          : APP_WORKER_FETCH_PATTERNS
        ).map((pattern) =>
          triggers.fetch({
            pattern,
            zone: "diaphana.io",
          }),
        ),
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      APP_BASE_PATH: bindings.text(curateWorker ? "/curate" : "/app"),
      CURATE_SURFACE: bindings.text(curateWorker ? "1" : "0"),
      // Deployed Map Worker strips nested Curate (redirect UI, 404 APIs).
      STRIP_CURATE_FROM_APP: bindings.text(curateWorker ? "0" : "1"),
      APP_ENV: bindings.text(isPreview ? "staging" : "production"),
      EXTRACT_ENABLED: bindings.text("false"),
      CF_ACCESS_TEAM_DOMAIN: bindings.text(
        "https://tetra4rnav.cloudflareaccess.com",
      ),
      // Production: BDBV Curate path-scoped Access app.
      // Preview: Workers Preview Access app (whole-preview gate).
      CF_ACCESS_AUD: bindings.text(
        isPreview
          ? "0ce99c26cf4e6266bdcad189995e6d35418cadd43d1c4882f4182255d0942cb7"
          : "30f260613dd004af14e3735da0b4cefb3b1ed822a7ef5804173a3d46c0b5550d",
      ),
      NEO4J_URI: bindings.secret(),
      NEO4J_USER: bindings.secret(),
      NEO4J_PASSWORD: bindings.secret(),
      DB: bindings.d1(
        isPreview
          ? {
              name: "bdbv-curate-preview",
              id: "8c803639-56c6-405c-8dba-157e054a483a",
            }
          : {
              name: "bdbv-curate",
              id: "13554abd-a4de-4194-84cb-3cca82a5d7bf",
            },
      ),
    },
  }),
}));
