import { bindings, defineConfig, defineWorker } from "cf/config";

/**
 * Production: https://2026bdbv.diaphana.io/app
 *
 * `domains` attaches the subdomain (Cloudflare creates DNS + cert).
 * APP_BASE_PATH=/app mounts the vinext app under /app.
 * Also set APP_BASE_PATH=/app as a Workers Builds *build* variable
 * so next.config.ts picks it up at compile time.
 */
export default defineConfig({
  worker: defineWorker({
    name: "bdbv-dashboard",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: false,
    previewUrls: false,
    domains: ["2026bdbv.diaphana.io"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      APP_BASE_PATH: bindings.text("/app"),
      APP_ENV: bindings.text("production"),
      EXTRACT_ENABLED: bindings.text("false"),
      CF_ACCESS_TEAM_DOMAIN: bindings.text(
        "https://tetra4rnav.cloudflareaccess.com",
      ),
      CF_ACCESS_AUD: bindings.text(
        "30f260613dd004af14e3735da0b4cefb3b1ed822a7ef5804173a3d46c0b5550d",
      ),
    },
  }),
});
