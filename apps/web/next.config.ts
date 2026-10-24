import type { NextConfig } from "next";

/**
 * Production target: https://www.diaphana.io/2026bdbv/app
 * Set APP_BASE_PATH=/2026bdbv/app in staging/production Workers.
 * Leave unset for local `npm run dev` at http://127.0.0.1:43127.
 */
const basePath = process.env.APP_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_APP_BASE_PATH: basePath,
  },
};

export default nextConfig;
