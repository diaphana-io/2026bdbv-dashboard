import {
  getCaseDetailJson,
  getCasesJson,
  getClaimsJson,
  getConflictViewsJson,
  getContactsJson,
  getInboxCandidatesJson,
  getMapSnapshotJson,
  getMeasuresJson,
  getOutbreakJson,
  getSourcesJson,
  overviewKpisJson,
} from "./data-json";
import type { CaseQueryOpts } from "./data-types";
import { isNeo4jConfigured } from "./neo4j";
import {
  getCaseDetailNeo4j,
  getCasesNeo4j,
  getClaimsNeo4j,
  getConflictViewsNeo4j,
  getContactsNeo4j,
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
  InboxRow,
  MapSnapshot,
  MeasureRow,
  SourceRow,
} from "./data-types";

async function fromNeo4jOrJson<T>(
  neo4jFn: () => Promise<T>,
  jsonFn: () => T | Promise<T>,
): Promise<T> {
  if (!isNeo4jConfigured()) return jsonFn();
  try {
    return await neo4jFn();
  } catch (err) {
    console.error("[data] neo4j query failed; falling back to JSON", err);
    return jsonFn();
  }
}

export async function getOutbreak() {
  return fromNeo4jOrJson(getOutbreakNeo4j, getOutbreakJson);
}

export async function getCases(opts?: CaseQueryOpts) {
  return fromNeo4jOrJson(
    () => getCasesNeo4j(opts),
    () => getCasesJson(opts),
  );
}

export async function getSources() {
  return fromNeo4jOrJson(getSourcesNeo4j, getSourcesJson);
}

export async function getClaims() {
  return fromNeo4jOrJson(getClaimsNeo4j, getClaimsJson);
}

export async function getConflictViews() {
  return fromNeo4jOrJson(getConflictViewsNeo4j, getConflictViewsJson);
}

export async function getContacts(country?: string) {
  return fromNeo4jOrJson(
    () => getContactsNeo4j(country),
    () => getContactsJson(country),
  );
}

export async function getMeasures(country?: string) {
  return fromNeo4jOrJson(
    () => getMeasuresNeo4j(country),
    () => getMeasuresJson(country),
  );
}

export async function getInboxCandidates() {
  return fromNeo4jOrJson(getInboxCandidatesNeo4j, getInboxCandidatesJson);
}

export async function overviewKpis(country?: string) {
  return fromNeo4jOrJson(
    () => overviewKpisNeo4j(country),
    () => overviewKpisJson(country),
  );
}

export async function getMapSnapshot(asOf: string) {
  return fromNeo4jOrJson(
    () => getMapSnapshotNeo4j(asOf),
    () => getMapSnapshotJson(asOf),
  );
}

export async function getCaseDetail(caseId: string) {
  return fromNeo4jOrJson(
    () => getCaseDetailNeo4j(caseId),
    () => getCaseDetailJson(caseId),
  );
}
