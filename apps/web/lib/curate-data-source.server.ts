import { cookies, headers } from "next/headers";
import { isNeo4jConfigured } from "./neo4j";
import {
  CURATE_DATA_SOURCE_COOKIE,
  CURATE_DATA_SOURCE_HEADER,
  parseCurateDataSource,
  resolveCurateDataSource,
  type CurateDataSource,
} from "./curate-data-source";

/**
 * Prefer bundled seed JSON over Neo4j.
 * Only true on Curate routes (header from middleware); Map ignores the cookie.
 */
export async function preferFixtureData(): Promise<boolean> {
  return (await getCurateDataSourceForRequest()) === "fixture";
}

export async function getCurateDataSourceForRequest(): Promise<CurateDataSource> {
  let headerValue: string | null = null;
  try {
    const h = await headers();
    headerValue = h.get(CURATE_DATA_SOURCE_HEADER);
  } catch {
    headerValue = null;
  }

  const fromHeader = parseCurateDataSource(headerValue);
  if (fromHeader) return fromHeader;

  // Non-Curate request (e.g. Map): never force fixture from cookie.
  if (!isNeo4jConfigured()) return "fixture";
  return "live";
}

/** Cookie + Neo4j for Curate UI initial switch state. */
export async function getCurateDataSourcePreference(): Promise<CurateDataSource> {
  let cookieValue: string | undefined;
  try {
    const jar = await cookies();
    cookieValue = jar.get(CURATE_DATA_SOURCE_COOKIE)?.value;
  } catch {
    cookieValue = undefined;
  }
  return resolveCurateDataSource(cookieValue, isNeo4jConfigured());
}

/** True when Curate reads/writes should hit Neo4j. */
export async function shouldUseNeo4j(): Promise<boolean> {
  if (!isNeo4jConfigured()) return false;
  return !(await preferFixtureData());
}
