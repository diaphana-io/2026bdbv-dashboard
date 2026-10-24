import casesData from "../data/cases.json";
import claimsData from "../data/claims.json";
import conflictsData from "../data/conflicts.json";
import contactsData from "../data/contacts.json";
import inboxData from "../data/inbox_candidates.json";
import measuresData from "../data/measures.json";
import outbreakData from "../data/outbreak.json";
import sourcesData from "../data/sources.json";
import type {
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

const cases = casesData as CaseRow[];
const claims = claimsData as ClaimRow[];
const conflicts = conflictsData as ConflictRow[];
const contacts = contactsData as ContactRow[];
const measures = measuresData as MeasureRow[];
const sources = sourcesData as SourceRow[];
const inbox = inboxData as InboxRow[];

export function getOutbreakJson() {
  return outbreakData as Record<string, unknown>;
}

export function getCasesJson(opts?: CaseQueryOpts) {
  let rows = cases.filter((c) => c.dataset === "production");
  if (opts?.country && opts.country !== "ALL") {
    rows = rows.filter((c) => c.admin0_iso === opts.country);
  }
  if (opts?.confirmedOnly) {
    rows = rows.filter(
      (c) => c.classification === "confirmed" && c.virus_species === "BDBV",
    );
  } else if (opts?.includeTemporalSuspects === false) {
    rows = rows.filter((c) => c.inclusion_reason !== "temporal_suspect");
  }
  return rows;
}

export function getSourcesJson() {
  return sources;
}

export function getClaimsJson() {
  return claims;
}

export function getConflictViewsJson(): ConflictView[] {
  return conflicts
    .filter((c) => c.status === "open")
    .map((conflict) => {
      const claim_a = claims.find((c) => c.id === conflict.claim_a_id)!;
      const claim_b = claims.find((c) => c.id === conflict.claim_b_id)!;
      const source_a = sources.find((s) => s.id === claim_a.source_id);
      const source_b = sources.find((s) => s.id === claim_b.source_id);
      return { conflict, claim_a, claim_b, source_a, source_b };
    });
}

export function getContactsJson(country?: string) {
  let rows = contacts.filter((c) => c.dataset === "production");
  if (country && country !== "ALL") {
    rows = rows.filter((c) => c.admin0_iso === country);
  }
  return rows;
}

export function getMeasuresJson(country?: string) {
  let rows = [...measures];
  if (country && country !== "ALL") {
    rows = rows.filter((m) => m.applies_to_countries.includes(country));
  }
  return rows;
}

export function getInboxCandidatesJson() {
  return inbox.filter((i) => i.curation_status === "candidate");
}

export function overviewKpisJson(country?: string) {
  const rows = getCasesJson({ country, includeTemporalSuspects: true });
  const confirmed = rows.filter((c) => c.classification === "confirmed").length;
  const deaths = rows.filter((c) => c.outcome === "deceased").length;
  const temporal = rows.filter((c) => c.inclusion_reason === "temporal_suspect").length;
  const followup = getContactsJson(country).filter((c) => c.followup.status === "active")
    .length;
  return { confirmed, deaths, temporal, followup, asOf: "2026-10-23" };
}
