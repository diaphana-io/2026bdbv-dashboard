import { bindings, defineConfig, defineWorker } from "cf/config";

/**
 * Production Worker config must match the remote Worker under Cloudflare Builds
 * (cf deploy uses strict mode in CI and aborts on dashboard/local drift).
 *
 * CF_ACCESS_* are JWT audience/team identifiers (not secrets). Neo4j and similar
 * credentials stay as Worker secrets, not text bindings.
 */
export default defineConfig({
  worker: defineWorker({
    name: "bdbv-dashboard",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    // Match remote: custom domain only (www.diaphana.io), no workers.dev / preview URLs.
    workersDev: false,
    previewUrls: false,
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      APP_BASE_PATH: bindings.text("/2026bdbv/app"),
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
