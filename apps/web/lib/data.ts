import casesData from "../data/cases.json";
import claimsData from "../data/claims.json";
import conflictsData from "../data/conflicts.json";
import contactsData from "../data/contacts.json";
import inboxData from "../data/inbox_candidates.json";
import measuresData from "../data/measures.json";
import outbreakData from "../data/outbreak.json";
import sourcesData from "../data/sources.json";

export type CaseRow = {
  id: string;
  visual_id: string;
  dataset: string;
  classification: string;
  date_of_onset?: string | null;
  date_of_reporting?: string | null;
  outcome?: string | null;
  pathogen_identified: boolean;
  virus_species: string;
  identification_status: string;
  in_outbreak_window: boolean;
  inclusion_reason: string;
  admin0_iso: string;
  admin1_name?: string;
  lat?: number;
  lon?: number;
  transmission_type?: string;
  confidence: string;
  is_synthetic: boolean;
  source_ids?: string[];
  notes?: string;
};

export type ClaimRow = {
  id: string;
  claim_type: string;
  subject_ref: string;
  object_value: Record<string, unknown>;
  as_of_date: string;
  confidence: string;
  review_status: string;
  source_id: string;
  excerpt?: string;
};

export type SourceRow = {
  id: string;
  url: string;
  title?: string | null;
  publisher?: string | null;
  kind: string;
  published_at?: string | null;
  curation_status: string;
};

export type ContactRow = {
  id: string;
  visual_id: string;
  dataset: string;
  role: string;
  admin0_iso: string;
  risk_level?: string;
  is_healthcare_worker?: boolean;
  exposure: {
    to_case_visual_id: string;
    date_of_last_contact: string;
    exposure_setting: string;
    intensity: string;
    certainty: string;
    relationship?: string;
  };
  followup: {
    window_start: string;
    window_end: string;
    incubation_max_days: number;
    status: string;
  };
};

export type MeasureRow = {
  id: string;
  title: string;
  measure_type: string;
  status: string;
  as_of_date: string;
  summary?: string;
  applies_to_countries: string[];
  poe?: string;
  confidence: string;
};

const cases = casesData as CaseRow[];
const claims = claimsData as ClaimRow[];
const conflicts = conflictsData as {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  subject_ref: string;
  claim_type: string;
  status: string;
  detected_at: string;
}[];
const contacts = contactsData as ContactRow[];
const measures = measuresData as MeasureRow[];
const sources = sourcesData as SourceRow[];
const inbox = inboxData as {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  kind: string;
  curation_status: string;
  discovered_at?: string;
}[];

export function getOutbreak() {
  return outbreakData as Record<string, unknown>;
}

export function getCases(opts?: {
  country?: string;
  confirmedOnly?: boolean;
  includeTemporalSuspects?: boolean;
}) {
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

export function getSources() {
  return sources;
}

export function getClaims() {
  return claims;
}

export function getConflictViews() {
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

export function getContacts(country?: string) {
  let rows = contacts.filter((c) => c.dataset === "production");
  if (country && country !== "ALL") {
    rows = rows.filter((c) => c.admin0_iso === country);
  }
  return rows;
}

export function getMeasures(country?: string) {
  let rows = [...measures];
  if (country && country !== "ALL") {
    rows = rows.filter((m) => m.applies_to_countries.includes(country));
  }
  return rows;
}

export function getInboxCandidates() {
  return inbox.filter((i) => i.curation_status === "candidate");
}

export function overviewKpis(country?: string) {
  const rows = getCases({ country, includeTemporalSuspects: true });
  const confirmed = rows.filter((c) => c.classification === "confirmed").length;
  const deaths = rows.filter((c) => c.outcome === "deceased").length;
  const temporal = rows.filter((c) => c.inclusion_reason === "temporal_suspect").length;
  const followup = getContacts(country).filter((c) => c.followup.status === "active").length;
  return { confirmed, deaths, temporal, followup, asOf: "2026-10-23" };
}
