import {
  getAggregateAdminUnitsJson,
  getCaseDetailJson,
  getCasesJson,
  getCatalogSourcesJson,
  getClaimsJson,
  getConflictViewsJson,
  getContactsJson,
  getCountryStatsJson,
  getInboxCandidatesJson,
  getIncidenceSeriesJson,
  getMapSnapshotGraphJson,
  getMapSnapshotJson,
  getMeasuresJson,
  getOutbreakJson,
  getSourceCatalogDetailJson,
  getSourcesJson,
  overviewKpisJson,
} from "./data-json";
import type { CaseQueryOpts, IncidenceSeriesOpts, MapSnapshot } from "./data-types";
import { preferFixtureData } from "./curate-data-source.server";
import { getDb } from "./d1";
import {
  getApprovedCaseCountClaimsD1,
  getCatalogSourcesD1,
  getClaimsD1,
  getConflictViewsD1,
  getInboxCandidatesD1,
  getIncidenceSeriesD1,
  getSourceCatalogDetailD1,
  getSourcesD1,
  sourcesRowCount,
} from "./d1-queries";
import {
  composeMapSnapshot,
  joinCaseCountClaimsToAdminUnits,
} from "./map-snapshot";
import { isNeo4jConfigured } from "./neo4j";
import {
  getAggregateAdminUnitsNeo4j,
  getCaseDetailNeo4j,
  getCasesNeo4j,
  getContactsNeo4j,
  getCountryStatsNeo4j,
  getMapSnapshotGraphNeo4j,
  getMeasuresNeo4j,
  getOutbreakNeo4j,
  overviewKpisNeo4j,
} from "./neo4j-queries";

export type {
  CaseDetail,
  CaseQueryOpts,
  CaseRow,
  CatalogClaimRow,
  CatalogSourceDetail,
  CatalogSourceRow,
  ClaimRow,
  ConflictRow,
  ConflictView,
  ContactRow,
  CountryStatRow,
  InboxRow,
  IncidenceRow,
  IncidenceSeriesOpts,
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

/** Drop cached graph/D1 reads after a successful Curate mutation. */
export function invalidateGraphReadCache(): void {
  readCache.clear();
}

function cacheGet<T>(cacheKey: string): CacheEntry<T> | undefined {
  return readCache.get(cacheKey) as CacheEntry<T> | undefined;
}

function cacheSet<T>(cacheKey: string, value: T): void {
  const ttl = neo4jReadCacheTtlMs();
  if (ttl > 0) {
    readCache.set(cacheKey, { value, expiresAt: Date.now() + ttl });
  }
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
  const cached = cacheGet<T>(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const value = await neo4jFn();
    cacheSet(cacheKey, value);
    return value;
  } catch (err) {
    console.error("[data] neo4j query failed; falling back", err);
    // Stale-while-revalidate: prefer last good Neo4j payload over seed JSON.
    if (cached) return cached.value;
    return jsonFn();
  }
}

/**
 * Curate Claim + Map Claim reads: D1 (non-empty sources) → bundled JSON.
 * No Neo4j Claim fallback (Phase 5). `preferFixtureData` forces JSON only.
 */
async function fromD1OrJson<T>(
  cacheKey: string,
  d1Fn: (db: D1Database) => Promise<T>,
  jsonFn: () => T | Promise<T>,
): Promise<T> {
  if (await preferFixtureData()) {
    return jsonFn();
  }

  const now = Date.now();
  const cached = cacheGet<T>(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const db = getDb();
  if (db) {
    try {
      const n = await sourcesRowCount(db);
      if (n >= 1) {
        const value = await d1Fn(db);
        cacheSet(cacheKey, value);
        return value;
      }
    } catch (err) {
      console.error("[data] d1 query failed; falling back", err);
      if (cached) return cached.value;
    }
  }

  return jsonFn();
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
  return fromD1OrJson("sources", getSourcesD1, getSourcesJson);
}

export async function getClaims() {
  return fromD1OrJson("claims", getClaimsD1, getClaimsJson);
}

export async function getIncidenceSeries(opts?: IncidenceSeriesOpts) {
  const metric = opts?.metricBasis ?? "reporting_date";
  const key = `incidence:${opts?.country ?? ""}:${opts?.asOf ?? ""}:${metric}`;
  return fromD1OrJson(
    key,
    (db) => getIncidenceSeriesD1(db, opts),
    () => getIncidenceSeriesJson(opts),
  );
}

export async function getConflictViews() {
  return fromD1OrJson(
    "conflicts",
    getConflictViewsD1,
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
  return fromD1OrJson(
    "inbox",
    getInboxCandidatesD1,
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

/**
 * Map snapshot: D1 case_count aggregates + Neo4j graph (no Claim MATCH).
 * Empty D1 / unbound → JSON aggregates + Neo4j graph (never Aura Claim).
 */
export async function getMapSnapshot(asOf: string): Promise<MapSnapshot> {
  if (await preferFixtureData()) {
    return getMapSnapshotJson(asOf);
  }

  const cacheKey = `map:${asOf}`;
  const now = Date.now();
  const cached = cacheGet<MapSnapshot>(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let aggregates = getMapSnapshotJson(asOf).aggregates;

  const db = getDb();
  if (db) {
    try {
      const n = await sourcesRowCount(db);
      if (n >= 1) {
        const claims = await getApprovedCaseCountClaimsD1(db, asOf);
        let units;
        if (isNeo4jConfigured()) {
          try {
            units = await getAggregateAdminUnitsNeo4j();
          } catch (err) {
            console.error(
              "[data] neo4j AdminUnit failed; using JSON geo with D1 claims",
              err,
            );
            units = getAggregateAdminUnitsJson();
          }
        } else {
          units = getAggregateAdminUnitsJson();
        }
        aggregates = joinCaseCountClaimsToAdminUnits(claims, units);
      }
    } catch (err) {
      console.error("[data] d1 map aggregates failed; using JSON aggregates", err);
      if (cached) return cached.value;
    }
  }

  let graph;
  if (isNeo4jConfigured()) {
    try {
      graph = await getMapSnapshotGraphNeo4j(asOf);
    } catch (err) {
      console.error(
        "[data] neo4j map graph failed; using JSON graph",
        err,
      );
      graph = getMapSnapshotGraphJson(asOf);
    }
  } else {
    graph = getMapSnapshotGraphJson(asOf);
  }

  const value = composeMapSnapshot(asOf, aggregates, graph);
  cacheSet(cacheKey, value);
  return value;
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

export async function getCatalogSources(opts?: { includeDismissed?: boolean }) {
  const key = `catalogSources:${opts?.includeDismissed ? "all" : "active"}`;
  return fromD1OrJson(
    key,
    (db) => getCatalogSourcesD1(db, opts),
    () => getCatalogSourcesJson(opts),
  );
}

export async function getSourceCatalogDetail(key: string) {
  return fromD1OrJson(
    `catalogDetail:${key}`,
    (db) => getSourceCatalogDetailD1(db, key),
    () => getSourceCatalogDetailJson(key),
  );
}
