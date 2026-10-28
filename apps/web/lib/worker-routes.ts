/** Path fetch patterns for the public Map / dashboard Worker (`/app`). */
export const APP_WORKER_FETCH_PATTERNS = [
  "2026bdbv.diaphana.io/app",
  "2026bdbv.diaphana.io/app/*",
] as const;

/**
 * Curate Worker patterns live in private `2026bdbv-curate` only.
 * Kept here so OSS CI can assert this Worker never claims them.
 */
export const PRIVATE_CURATE_FETCH_PATTERNS = [
  "2026bdbv.diaphana.io/curate",
  "2026bdbv.diaphana.io/curate/*",
] as const;

export function assertWorkerRouteSeparation(
  appPatterns: readonly string[],
  curatePatterns: readonly string[] = PRIVATE_CURATE_FETCH_PATTERNS,
): void {
  for (const p of appPatterns) {
    if (p.includes("/curate")) {
      throw new Error(`App Worker must not own Curate routes: ${p}`);
    }
  }
  for (const p of curatePatterns) {
    if (p.includes("/app")) {
      throw new Error(`Curate Worker must not own /app routes: ${p}`);
    }
  }
}
