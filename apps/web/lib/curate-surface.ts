/**
 * Curate can run as nested routes under the Map Worker (`/app/curate…`)
 * or as its own Worker mounted at `/curate` (APP_BASE_PATH=/curate).
 *
 * On the Curate Worker, Next strips the base path so UI lives at `/inbox`
 * (not `/curate/inbox`) and APIs at `/api/adopt-source` (rewritten to
 * `/api/curate/adopt-source` — see next.config.ts).
 */

export type AccessSurface = "app" | "curate";

export function getAccessSurface(
  env: {
    CURATE_SURFACE?: string | null;
    APP_BASE_PATH?: string | null;
    NEXT_PUBLIC_CURATE_SURFACE?: string | null;
  } = process.env,
): AccessSurface {
  if (
    env.CURATE_SURFACE === "1" ||
    env.NEXT_PUBLIC_CURATE_SURFACE === "1" ||
    env.APP_BASE_PATH === "/curate"
  ) {
    return "curate";
  }
  return "app";
}

export function isCurateSurface(
  env?: Parameters<typeof getAccessSurface>[0],
): boolean {
  return getAccessSurface(env) === "curate";
}

type SurfaceEnv = Parameters<typeof getAccessSurface>[0];

/**
 * App-relative Curate UI href (Next `Link` / `redirect` — basePath applied by Next).
 * @param path e.g. `"inbox"`, `"/inbox"`, `"cases/extract"`, `""` for home
 */
export function curateHref(path = "", env?: SurfaceEnv): string {
  const rest = path.replace(/^\/+/, "");
  if (isCurateSurface(env)) {
    return rest ? `/${rest}` : "/";
  }
  return rest ? `/curate/${rest}` : "/curate";
}

/**
 * App-relative Curate API path for `fetch` (pass through `withBasePath`).
 * @param endpoint e.g. `"adopt-source"` or `"/adopt-source"`
 */
export function curateApiPath(endpoint: string, env?: SurfaceEnv): string {
  const name = endpoint.replace(/^\/+/, "");
  if (isCurateSurface(env)) {
    return `/api/${name}`;
  }
  return `/api/curate/${name}`;
}

/** Absolute public origin for cross-Worker links from the Map shell. */
export const CURATE_PUBLIC_ORIGIN = "https://2026bdbv.diaphana.io";

/** Public URL for Curate home (Map → Curate deep link). */
export function curatePublicUrl(path = ""): string {
  const rest = path.replace(/^\/+/, "");
  return rest
    ? `${CURATE_PUBLIC_ORIGIN}/curate/${rest}`
    : `${CURATE_PUBLIC_ORIGIN}/curate`;
}

/**
 * On the Map Worker in staging/production, stop serving Curate mutate/UI
 * (redirect UI; 404 APIs). Local `npm run dev` keeps in-tree Curate unless
 * STRIP_CURATE_FROM_APP=1.
 */
export function shouldStripCurateFromApp(
  env: {
    STRIP_CURATE_FROM_APP?: string | null;
    APP_ENV?: string | null;
    CURATE_SURFACE?: string | null;
    APP_BASE_PATH?: string | null;
    NEXT_PUBLIC_CURATE_SURFACE?: string | null;
  } = process.env,
): boolean {
  if (getAccessSurface(env) === "curate") return false;
  if (env.STRIP_CURATE_FROM_APP === "1") return true;
  if (env.STRIP_CURATE_FROM_APP === "0") return false;
  const appEnv = env.APP_ENV ?? "development";
  return appEnv === "production" || appEnv === "staging";
}
