import type { NextConfig } from "next";

/**
 * Production Map: https://2026bdbv.diaphana.io/app
 * Production Curate Worker: https://2026bdbv.diaphana.io/curate
 *
 * `basePath` is compile-time (vite/next). Runtime Worker vars alone do not
 * remount routes — a build with empty basePath serves at `/`, so `/app` 404s.
 *
 * - `npm run dev`: unset → "" (http://127.0.0.1:43127/)
 * - `vite build` / Workers Builds: unset → "/app"
 * - Curate Worker: APP_BASE_PATH=/curate + CURATE_SURFACE=1
 */
function resolveBasePath(): string {
  if (process.env.APP_BASE_PATH != null) return process.env.APP_BASE_PATH;
  return process.env.NODE_ENV === "production" ? "/app" : "";
}

function isCurateBuild(): boolean {
  return (
    process.env.CURATE_SURFACE === "1" ||
    process.env.APP_BASE_PATH === "/curate"
  );
}

const basePath = resolveBasePath();
const curateBuild = isCurateBuild();

const CURATE_UI_SEGMENTS = [
  "overview",
  "inbox",
  "catalog",
  "extract",
  "review",
  "conflicts",
  "status",
  "source",
  "cases",
] as const;

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_APP_BASE_PATH: basePath,
    NEXT_PUBLIC_CURATE_SURFACE: curateBuild ? "1" : "0",
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
    if (curateBuild) {
      // After basePath strip, `/` is Map's page — force Curate Overview.
      out.push({
        source: "/",
        destination: "/overview",
        permanent: false,
      });
    }
    return out;
  },
  async rewrites() {
    if (!curateBuild) return [];
    // Public `/curate/inbox` → strip base → `/inbox` → rewrite → `/curate/inbox` files.
    // Do not rewrite `/` here — page route wins; use redirect + page.tsx instead.
    return [
      ...CURATE_UI_SEGMENTS.map((seg) => ({
        source: `/${seg}`,
        destination: `/curate/${seg}`,
      })),
      { source: "/cases/:path*", destination: "/curate/cases/:path*" },
      { source: "/api/:path*", destination: "/api/curate/:path*" },
    ];
  },
};

export default nextConfig;
