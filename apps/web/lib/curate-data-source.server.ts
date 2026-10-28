import { headers } from "next/headers";
import { isNeo4jConfigured } from "./neo4j";
import {
  CURATE_DATA_SOURCE_HEADER,
  parseCurateDataSource,
  type CurateDataSource,
} from "./curate-data-source";

/**
 * Prefer bundled seed JSON over Neo4j/D1.
 * Map ignores curator fixture cookies; only an explicit request header
 * (set by middleware on legacy Curate paths) can force fixture mode.
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

  if (!isNeo4jConfigured()) return "fixture";
  return "live";
}

/** True when Map/dashboard reads should hit Neo4j. */
export async function shouldUseNeo4j(): Promise<boolean> {
  if (!isNeo4jConfigured()) return false;
  return !(await preferFixtureData());
}
