import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

/**
 * Production: https://2026bdbv.diaphana.io/app
 *
 * Non-main branches use `cf previews deploy` (Worker Previews) so they get a
 * preview URL instead of writing to the production hostname routes.
 *
 * Path-scoped routes (not a Custom Domain) so `/docs` and other host paths can
 * be served by Cloudflare Pages or other origins. Keep a proxied originless
 * DNS record for `2026bdbv.diaphana.io` (AAAA 100::).
 *
 * APP_BASE_PATH=/app mounts the vinext app under /app.
 * Also set APP_BASE_PATH=/app as a Workers Builds *build* variable
 * so next.config.ts picks it up at compile time.
 *
 * Apex `/` → `/app` stays a zone Single Redirect (http_request_dynamic_redirect),
 * not this Worker — path routes never see `/`.
 */
export default defineConfig(({ isPreview }) => ({
  worker: defineWorker({
    name: "bdbv-dashboard",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    // Production: path routes only (workers.dev Production stays off).
    // previewUrls must stay true on every deploy — it is a Worker-level host
    // flag; gating it on isPreview lets production deploys turn Preview off,
    // which makes `cf previews deploy` succeed with empty preview_urls.
    workersDev: false,
    previewUrls: true,
    // Prefer exact /app + /app/* over /app* (avoids matching /application etc.).
    triggers: isPreview
      ? []
      : [
          triggers.fetch({
            pattern: "2026bdbv.diaphana.io/app",
            zone: "diaphana.io",
          }),
          triggers.fetch({
            pattern: "2026bdbv.diaphana.io/app/*",
            zone: "diaphana.io",
          }),
        ],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      APP_BASE_PATH: bindings.text("/app"),
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
      // Set via Worker secrets / .dev.vars — never commit values.
      NEO4J_URI: bindings.secret(),
      NEO4J_USER: bindings.secret(),
      NEO4J_PASSWORD: bindings.secret(),
      // Claim Curate D1: separate prod vs preview instances (no preview_database_id).
      // Migrations live in ./migrations (cf/wrangler default; same schema both DBs).
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
