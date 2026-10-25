import {
  getCaseDetailJson,
  getCasesJson,
  getClaimsJson,
  getConflictViewsJson,
  getContactsJson,
  getCountryStatsJson,
  getInboxCandidatesJson,
  getMapSnapshotJson,
  getMeasuresJson,
  getOutbreakJson,
  getSourcesJson,
  overviewKpisJson,
} from "./data-json";
import type { CaseQueryOpts } from "./data-types";
import { preferFixtureData } from "./curate-data-source.server";
import { isNeo4jConfigured } from "./neo4j";
import {
  getCaseDetailNeo4j,
  getCasesNeo4j,
  getClaimsNeo4j,
  getConflictViewsNeo4j,
  getContactsNeo4j,
  getCountryStatsNeo4j,
  getInboxCandidatesNeo4j,
  getMapSnapshotNeo4j,
  getMeasuresNeo4j,
  getOutbreakNeo4j,
  getSourcesNeo4j,
  overviewKpisNeo4j,
} from "./neo4j-queries";

export type {
  CaseDetail,
  CaseQueryOpts,
  CaseRow,
  ClaimRow,
  ConflictRow,
  ConflictView,
  ContactRow,
  CountryStatRow,
  InboxRow,
  MapSnapshot,
  MeasureRow,
  SourceRow,
} from "./data-types";

type CacheEntry<T> = { value: T; expiresAt: number };

/** Isolate-local SWR cache for curated read models (see docs/curate-graph-serving.md). */
const readCache = new Map<string, CacheEntry<unknown>>();

export function neo4jReadCacheTtlMs(
  source: NodeJS.ProcessEnv = process.env,
): number {
  const raw = source.NEO4J_READ_CACHE_TTL_MS;
  const n = raw ? Number(raw) : 30_000;
  return Number.isFinite(n) && n >= 0 ? n : 30_000;
}

/** Drop cached graph reads after a successful Curate mutation. */
export function invalidateGraphReadCache(): void {
  readCache.clear();
}

async function fromNeo4jOrJson<T>(
  cacheKey: string,
  neo4jFn: () => Promise<T>,
  jsonFn: () => T | Promise<T>,
): Promise<T> {
  if (!isNeo4jConfigured() || (await preferFixtureData())) {
    return jsonFn();
  }

  const now = Date.now();
  const cached = readCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const value = await neo4jFn();
    const ttl = neo4jReadCacheTtlMs();
    if (ttl > 0) {
      readCache.set(cacheKey, { value, expiresAt: now + ttl });
    }
    return value;
  } catch (err) {
    console.error("[data] neo4j query failed; falling back", err);
    // Stale-while-revalidate: prefer last good Neo4j payload over seed JSON.
    if (cached) return cached.value;
    return jsonFn();
  }
}

export async function getOutbreak() {
  return fromNeo4jOrJson("outbreak", getOutbreakNeo4j, getOutbreakJson);
}

export async function getCases(opts?: CaseQueryOpts) {
  const key = `cases:${opts?.includeTemporalSuspects ? "all" : "prod"}:${opts?.country ?? ""}`;
  return fromNeo4jOrJson(
    key,
    () => getCasesNeo4j(opts),
    () => getCasesJson(opts),
  );
}

export async function getSources() {
  return fromNeo4jOrJson("sources", getSourcesNeo4j, getSourcesJson);
}

export async function getClaims() {
  return fromNeo4jOrJson("claims", getClaimsNeo4j, getClaimsJson);
}

export async function getConflictViews() {
  return fromNeo4jOrJson(
    "conflicts",
    getConflictViewsNeo4j,
    getConflictViewsJson,
  );
}

export async function getContacts(country?: string) {
  return fromNeo4jOrJson(
    `contacts:${country ?? ""}`,
    () => getContactsNeo4j(country),
    () => getContactsJson(country),
  );
}

export async function getMeasures(country?: string) {
  return fromNeo4jOrJson(
    `measures:${country ?? ""}`,
    () => getMeasuresNeo4j(country),
    () => getMeasuresJson(country),
  );
}

export async function getInboxCandidates() {
  return fromNeo4jOrJson(
    "inbox",
    getInboxCandidatesNeo4j,
    getInboxCandidatesJson,
  );
}

export async function overviewKpis(country?: string) {
  return fromNeo4jOrJson(
    `kpis:${country ?? ""}`,
    () => overviewKpisNeo4j(country),
    () => overviewKpisJson(country),
  );
}

export async function getMapSnapshot(asOf: string) {
  return fromNeo4jOrJson(
    `map:${asOf}`,
    () => getMapSnapshotNeo4j(asOf),
    () => getMapSnapshotJson(asOf),
  );
}

export async function getCaseDetail(caseId: string) {
  return fromNeo4jOrJson(
    `case:${caseId}`,
    () => getCaseDetailNeo4j(caseId),
    () => getCaseDetailJson(caseId),
  );
}

/** Country-level stats seam — stubs return [] until real records exist. */
export async function getCountryStats(asOf?: string) {
  return fromNeo4jOrJson(
    `countryStats:${asOf ?? "latest"}`,
    () => getCountryStatsNeo4j(asOf),
    () => getCountryStatsJson(asOf),
  );
}
