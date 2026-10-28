/**
 * Cross-links and Map-side strip helpers after Curate moved to private
 * `diaphana-io/2026bdbv-curate` at `/curate`.
 */

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
 * (redirect UI; 404 APIs). Local `npm run dev` keeps strip off unless
 * STRIP_CURATE_FROM_APP=1.
 */
export function shouldStripCurateFromApp(
  env: {
    STRIP_CURATE_FROM_APP?: string | null;
    APP_ENV?: string | null;
  } = process.env,
): boolean {
  if (env.STRIP_CURATE_FROM_APP === "1") return true;
  if (env.STRIP_CURATE_FROM_APP === "0") return false;
  const appEnv = env.APP_ENV ?? "development";
  return appEnv === "production" || appEnv === "staging";
}
