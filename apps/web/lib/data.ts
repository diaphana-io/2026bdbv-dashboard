import {
  getCasesJson,
  getClaimsJson,
  getConflictViewsJson,
  getContactsJson,
  getInboxCandidatesJson,
  getMeasuresJson,
  getOutbreakJson,
  getSourcesJson,
  overviewKpisJson,
} from "./data-json";
import type { CaseQueryOpts } from "./data-types";
import { isNeo4jConfigured } from "./neo4j";
import {
  getCasesNeo4j,
  getClaimsNeo4j,
  getConflictViewsNeo4j,
  getContactsNeo4j,
  getInboxCandidatesNeo4j,
  getMeasuresNeo4j,
  getOutbreakNeo4j,
  getSourcesNeo4j,
  overviewKpisNeo4j,
} from "./neo4j-queries";

export type {
  CaseQueryOpts,
  CaseRow,
  ClaimRow,
  ConflictRow,
  ConflictView,
  ContactRow,
  InboxRow,
  MeasureRow,
  SourceRow,
} from "./data-types";

export async function getOutbreak() {
  if (isNeo4jConfigured()) return getOutbreakNeo4j();
  return getOutbreakJson();
}

export async function getCases(opts?: CaseQueryOpts) {
  if (isNeo4jConfigured()) return getCasesNeo4j(opts);
  return getCasesJson(opts);
}

export async function getSources() {
  if (isNeo4jConfigured()) return getSourcesNeo4j();
  return getSourcesJson();
}

export async function getClaims() {
  if (isNeo4jConfigured()) return getClaimsNeo4j();
  return getClaimsJson();
}

export async function getConflictViews() {
  if (isNeo4jConfigured()) return getConflictViewsNeo4j();
  return getConflictViewsJson();
}

export async function getContacts(country?: string) {
  if (isNeo4jConfigured()) return getContactsNeo4j(country);
  return getContactsJson(country);
}

export async function getMeasures(country?: string) {
  if (isNeo4jConfigured()) return getMeasuresNeo4j(country);
  return getMeasuresJson(country);
}

export async function getInboxCandidates() {
  if (isNeo4jConfigured()) return getInboxCandidatesNeo4j();
  return getInboxCandidatesJson();
}

export async function overviewKpis(country?: string) {
  if (isNeo4jConfigured()) return overviewKpisNeo4j(country);
  return overviewKpisJson(country);
}
