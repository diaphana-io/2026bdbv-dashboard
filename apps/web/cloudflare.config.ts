import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
// Explicit .ts extension: Workers Builds loads this file via Node ESM.
import { APP_WORKER_FETCH_PATTERNS } from "./lib/worker-routes.ts";

/**
 * Public Map / dashboard Worker (`bdbv-dashboard` at `/app`).
 *
 * Curate UI + mutate live in private `diaphana-io/2026bdbv-curate`
 * (`bdbv-curate-app` at `/curate`). This OSS Worker must not own `/curate*`.
 *
 * Production Map: https://2026bdbv.diaphana.io/app
 *
 * Non-main branches use `cf previews deploy` (Worker Previews).
 *
 * APP_BASE_PATH must also be set as a Workers Builds *build* variable so
 * next.config.ts picks it up at compile time.
 *
 * Apex `/` → `/app` stays a zone Single Redirect (not this Worker).
 *
 * Access team domain / AUD and Neo4j credentials are Worker secrets (never
 * committed). Set production via `wrangler secret put`; preview via
 * `wrangler preview base-config secret put` (and per-Preview overrides).
 * D1 binds by database name only (no UUID in source).
 */
export default defineConfig(({ isPreview }) => ({
  worker: defineWorker({
    name: "bdbv-dashboard",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: false,
    previewUrls: true,
    triggers: isPreview
      ? []
      : APP_WORKER_FETCH_PATTERNS.map((pattern) =>
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
      APP_BASE_PATH: bindings.text("/app"),
      CURATE_SURFACE: bindings.text("0"),
      // Redirect legacy `/app/curate` UI → `/curate`; 404 nested mutate APIs.
      STRIP_CURATE_FROM_APP: bindings.text("1"),
      APP_ENV: bindings.text(isPreview ? "staging" : "production"),
      EXTRACT_ENABLED: bindings.text("false"),
      // Defense in depth for leftover Access-gated paths; values are secrets.
      CF_ACCESS_TEAM_DOMAIN: bindings.secret(),
      CF_ACCESS_AUD: bindings.secret(),
      NEO4J_URI: bindings.secret(),
      NEO4J_USER: bindings.secret(),
      NEO4J_PASSWORD: bindings.secret(),
      DB: bindings.d1({
        name: isPreview ? "bdbv-curate-preview" : "bdbv-curate",
      }),
    },
  }),
}));
