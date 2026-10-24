import type { NextConfig } from "next";

/**
 * Production target: https://2026bdbv.diaphana.io/app
 *
 * `basePath` is compile-time (vite/next). Runtime Worker vars alone do not
 * remount routes — a build with empty basePath serves at `/`, so `/app` 404s.
 *
 * - `npm run dev`: unset → "" (http://127.0.0.1:43127/)
 * - `vite build` / Workers Builds: unset → "/app"
 * - Override anytime with APP_BASE_PATH (use "" for root on a preview host)
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
  },
};

export default nextConfig;
