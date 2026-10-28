import type { NextConfig } from "next";

/**
 * Production Map: https://2026bdbv.diaphana.io/app
 * Curate (private repo): https://2026bdbv.diaphana.io/curate
 *
 * `basePath` is compile-time (vite/next). Runtime Worker vars alone do not
 * remount routes — a build with empty basePath serves at `/`, so `/app` 404s.
 *
 * - `npm run dev`: unset → "" (http://127.0.0.1:43127/)
 * - `vite build` / Workers Builds: unset → "/app"
 */
function resolveBasePath(): string {
  if (process.env.APP_BASE_PATH != null) return process.env.APP_BASE_PATH;
  return process.env.NODE_ENV === "production" ? "/app" : "";
}

const basePath = resolveBasePath();

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_APP_BASE_PATH: basePath,
    NEXT_PUBLIC_CURATE_SURFACE: "0",
  },
  async redirects() {
    const out: {
      source: string;
      destination: string;
      permanent: boolean;
      basePath?: false;
    }[] = [];
    if (basePath) {
      // Bare host `/` → mount (preview workers.dev without path prefix).
      out.push({
        source: "/",
        destination: basePath,
        permanent: false,
        basePath: false,
      });
    }
    return out;
  },
};

export default nextConfig;
