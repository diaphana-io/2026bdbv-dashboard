/**
 * Curate UI data-source preference.
 * - `fixture` — bundled seed under `apps/web/data` (from repo `data/curated`)
 * - `live` — Neo4j when configured (falls back to fixture on Bolt errors)
 */

export const CURATE_DATA_SOURCE_COOKIE = "bdbv_curate_data_source";
export const CURATE_DATA_SOURCE_MAX_AGE = 60 * 60 * 24 * 365;
/** Forwarded by middleware on Curate paths only (see curate-data-source.server). */
export const CURATE_DATA_SOURCE_HEADER = "x-bdbv-data-source";

export type CurateDataSource = "fixture" | "live";

export function parseCurateDataSource(
  raw: string | undefined | null,
): CurateDataSource | null {
  if (raw === "fixture" || raw === "live") return raw;
  return null;
}

/** Default when no cookie: live if Neo4j is configured, else fixture. */
export function resolveCurateDataSource(
  cookieValue: string | undefined | null,
  neo4jConfigured: boolean,
): CurateDataSource {
  const parsed = parseCurateDataSource(cookieValue);
  if (parsed) return parsed;
  return neo4jConfigured ? "live" : "fixture";
}

export function curateDataSourceCookieHeader(source: CurateDataSource): string {
  return `${CURATE_DATA_SOURCE_COOKIE}=${source}; path=/; max-age=${CURATE_DATA_SOURCE_MAX_AGE}; SameSite=Lax`;
}
