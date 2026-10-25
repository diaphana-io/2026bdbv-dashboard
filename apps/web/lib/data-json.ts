import adminUnitsData from "../data/admin_units.json";
import casesData from "../data/cases.json";
import claimsData from "../data/claims.json";
import conflictsData from "../data/conflicts.json";
import contactsData from "../data/contacts.json";
import hospitalizationsData from "../data/hospitalizations.json";
import inboxData from "../data/inbox_candidates.json";
import measuresData from "../data/measures.json";
import outbreakData from "../data/outbreak.json";
import sourcesData from "../data/sources.json";
import travelLegsData from "../data/travel_legs.json";
import type {
  CaseDetail,
  CaseDetailEvent,
  CaseDetailSource,
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
  MapAggregate,
  MapSnapshot,
  MeasureRow,
  SourceRow,
} from "./data-types";

const CATALOG_STATUSES = new Set([
  "fetched",
  "extracted",
  "in_review",
  "done",
]);

type AdminUnitRow = {
  id: string;
  iso: string;
  level: string;
  name: string;
  tracking_mode?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type TravelLegRow = {
  id: string;
  person_id: string;
  departed_at?: string | null;
  arrived_at?: string | null;
  mode: string;
  from_admin_id?: string | null;
  to_admin_id?: string | null;
};

type HospitalizationRow = {
  id: string;
  case_id: string;
  admitted_at?: string | null;
  discharged_at?: string | null;
  facility_name?: string | null;
};

const cases = casesData as CaseRow[];
const claims = claimsData as ClaimRow[];
const conflicts = conflictsData as ConflictRow[];
const contacts = contactsData as ContactRow[];
const measures = measuresData as MeasureRow[];
const sources = sourcesData as SourceRow[];
const inbox = inboxData as InboxRow[];
const adminUnits = adminUnitsData as AdminUnitRow[];
const travelLegs = travelLegsData as TravelLegRow[];
const hospitalizations = hospitalizationsData as HospitalizationRow[];

function onOrBefore(date: string | null | undefined, asOf: string): boolean {
  if (!date) return false;
  return date.slice(0, 10) <= asOf;
}

function adminById(id: string | null | undefined) {
  if (!id) return undefined;
  return adminUnits.find((a) => a.id === id);
}

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

function caseVisibleBy(asOf: string, c: CaseRow): boolean {
  const d = c.date_of_reporting ?? c.date_of_onset ?? null;
  return onOrBefore(d, asOf);
}

export function getMapSnapshotJson(asOf: string): MapSnapshot {
  const aggregates: MapAggregate[] = [];
  for (const unit of adminUnits.filter((a) => a.tracking_mode === "aggregate")) {
    if (unit.lat == null || unit.lon == null) continue;
    const series = claims
      .filter(
        (c) =>
          c.claim_type === "case_count" &&
          c.subject_ref === unit.iso &&
          c.review_status === "approved" &&
          onOrBefore(c.as_of_date, asOf),
      )
      .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
    const latest = series[series.length - 1];
    if (!latest) continue;
    const ov = latest.object_value;
    aggregates.push({
      admin_iso: unit.iso,
      name: unit.name,
      lat: unit.lat,
      lon: unit.lon,
      confirmed: Number(ov.confirmed ?? 0),
      deaths: Number(ov.deaths ?? 0),
      as_of_date: latest.as_of_date,
    });
  }

  const mapCases = getCasesJson({ includeTemporalSuspects: true })
    .filter((c) => caseVisibleBy(asOf, c) && c.lat != null && c.lon != null)
    .map((c) => ({
      id: c.id,
      visual_id: c.visual_id,
      admin0_iso: c.admin0_iso,
      classification: c.classification,
      lat: c.lat!,
      lon: c.lon!,
      date_of_onset: c.date_of_onset ?? null,
      date_of_reporting: c.date_of_reporting ?? null,
    }));

  const personToCase = new Map(
    cases
      .filter((c) => (c as CaseRow & { person_id?: string }).person_id)
      .map((c) => [(c as CaseRow & { person_id?: string }).person_id!, c.id]),
  );

  const travels = travelLegs
    .filter((leg) => {
      const start = leg.departed_at ?? leg.arrived_at;
      return start != null && onOrBefore(start, asOf);
    })
    .flatMap((leg) => {
      const from = adminById(leg.from_admin_id);
      const to = adminById(leg.to_admin_id);
      if (
        from?.lat == null ||
        from.lon == null ||
        to?.lat == null ||
        to.lon == null
      ) {
        return [];
      }
      return [
        {
          id: leg.id,
          person_id: leg.person_id,
          case_id: personToCase.get(leg.person_id) ?? null,
          mode: leg.mode,
          departed_at: leg.departed_at ?? null,
          arrived_at: leg.arrived_at ?? null,
          from: {
            admin_id: from.id,
            iso: from.iso,
            lat: from.lat,
            lon: from.lon,
          },
          to: { admin_id: to.id, iso: to.iso, lat: to.lat, lon: to.lon },
        },
      ];
    });

  const caseByVisual = new Map(cases.map((c) => [c.visual_id, c]));
  const exposures = getContactsJson()
    .filter((ct) => onOrBefore(ct.exposure.date_of_last_contact, asOf))
    .map((ct) => {
      const toCase = caseByVisual.get(ct.exposure.to_case_visual_id);
      return {
        from_person_id: ct.id,
        from_visual_id: ct.visual_id,
        to_case_id: toCase?.id ?? "",
        to_case_visual_id: ct.exposure.to_case_visual_id,
        date_of_last_contact: ct.exposure.date_of_last_contact,
        to_lat: toCase?.lat,
        to_lon: toCase?.lon,
      };
    })
    .filter((e) => e.to_case_id);

  return { asOf, aggregates, cases: mapCases, travels, exposures };
}

export function getCaseDetailJson(caseId: string): CaseDetail | null {
  const c = cases.find((row) => row.id === caseId);
  if (!c) return null;
  const events: CaseDetailEvent[] = [];
  if (c.date_of_onset) {
    events.push({ kind: "onset", at: c.date_of_onset, label: "Symptom onset" });
  }
  if (c.date_of_reporting) {
    events.push({
      kind: "reporting",
      at: c.date_of_reporting,
      label: "Reported",
    });
  }
  const personId = (c as CaseRow & { person_id?: string }).person_id;
  for (const leg of travelLegs.filter((t) => t.person_id === personId)) {
    const from = adminById(leg.from_admin_id);
    const to = adminById(leg.to_admin_id);
    const at = leg.arrived_at ?? leg.departed_at;
    if (!at) continue;
    events.push({
      kind: "travel",
      at,
      label: `Travel ${from?.iso ?? "?"} → ${to?.iso ?? "?"} (${leg.mode})`,
      meta: {
        mode: leg.mode,
        departed_at: leg.departed_at,
        arrived_at: leg.arrived_at,
      },
    });
  }
  for (const h of hospitalizations.filter((x) => x.case_id === caseId)) {
    if (h.admitted_at) {
      events.push({
        kind: "hospitalization",
        at: h.admitted_at,
        label: h.facility_name
          ? `Admitted · ${h.facility_name}`
          : "Admitted",
        meta: {
          discharged_at: h.discharged_at,
          facility_name: h.facility_name,
        },
      });
    }
  }
  for (const ct of getContactsJson().filter(
    (x) => x.exposure.to_case_visual_id === c.visual_id,
  )) {
    events.push({
      kind: "exposure",
      at: ct.exposure.date_of_last_contact,
      label: `Contact ${ct.visual_id}`,
      meta: { contact_id: ct.id, intensity: ct.exposure.intensity },
    });
  }
  if (c.outcome && c.outcome !== "unknown") {
    const outcomeAt =
      (c as CaseRow & { date_of_outcome?: string }).date_of_outcome ??
      c.date_of_reporting ??
      c.date_of_onset;
    if (outcomeAt) {
      events.push({
        kind: "outcome",
        at: outcomeAt,
        label: `Outcome: ${c.outcome}`,
      });
    }
  }
  events.sort((a, b) => a.at.localeCompare(b.at));
  const sourceIds = c.source_ids ?? [];
  const detailSources: CaseDetailSource[] = sourceIds.flatMap((sid) => {
    const s = sources.find((row) => row.id === sid);
    if (!s) return [];
    return [
      {
        id: s.id,
        title: s.title ?? null,
        publisher: s.publisher ?? null,
        kind: s.kind,
        url: s.url,
        published_at: s.published_at ?? null,
      },
    ];
  });
  return {
    id: c.id,
    visual_id: c.visual_id,
    admin0_iso: c.admin0_iso,
    classification: c.classification,
    lat: c.lat,
    lon: c.lon,
    source_ids: sourceIds,
    sources: detailSources,
    events,
  };
}

/** Stub — country stats are not derived from MapCase rollups. */
export function getCountryStatsJson(_asOf?: string): CountryStatRow[] {
  return [];
}

type SeedSource = SourceRow & {
  normalized_url?: string;
  evidence_class?: string;
  discovered_at?: string | null;
};

type SeedClaim = ClaimRow & {
  lineage_id?: string;
  version?: number;
  is_head?: boolean;
  extractor?: string;
  reviewed_at?: string | null;
};

function catalogSourceFromSeed(
  s: SeedSource,
  sourceClaims: SeedClaim[],
): CatalogSourceRow {
  const extractors = [
    ...new Set(
      sourceClaims
        .map((c) => c.extractor)
        .filter((e): e is string => Boolean(e)),
    ),
  ];
  const latest_reviewed_at =
    sourceClaims
      .map((c) => c.reviewed_at)
      .filter((x): x is string => Boolean(x))
      .sort()
      .at(-1) ?? null;
  return {
    id: s.id,
    url: s.url,
    normalized_url: s.normalized_url ?? s.url,
    title: s.title ?? null,
    publisher: s.publisher ?? null,
    kind: s.kind,
    evidence_class: s.evidence_class,
    curation_status: s.curation_status,
    published_at: s.published_at ?? null,
    discovered_at: s.discovered_at ?? null,
    claim_count: sourceClaims.length,
    approved_count: sourceClaims.filter((c) => c.review_status === "approved")
      .length,
    pending_count: sourceClaims.filter(
      (c) => c.review_status === "pending_review",
    ).length,
    latest_reviewed_at,
    extractors,
  };
}

export function getCatalogSourcesJson(opts?: {
  includeDismissed?: boolean;
}): CatalogSourceRow[] {
  const seedSources = sources as SeedSource[];
  const seedClaims = claims as SeedClaim[];
  return seedSources
    .filter((s) => {
      if (CATALOG_STATUSES.has(s.curation_status)) return true;
      return Boolean(opts?.includeDismissed && s.curation_status === "dismissed");
    })
    .map((s) => {
      const sourceClaims = seedClaims.filter((c) => c.source_id === s.id);
      return catalogSourceFromSeed(s, sourceClaims);
    })
    .sort((a, b) => {
      const ta =
        a.latest_reviewed_at ?? a.published_at ?? a.discovered_at ?? "";
      const tb =
        b.latest_reviewed_at ?? b.published_at ?? b.discovered_at ?? "";
      return tb.localeCompare(ta);
    });
}

export function getSourceCatalogDetailJson(
  key: string,
): CatalogSourceDetail | null {
  const seedSources = sources as SeedSource[];
  const seedClaims = claims as SeedClaim[];
  const s = seedSources.find(
    (row) =>
      row.id === key ||
      row.normalized_url === key ||
      row.url === key,
  );
  if (!s) return null;
  if (
    !CATALOG_STATUSES.has(s.curation_status) &&
    s.curation_status !== "dismissed"
  ) {
    return null;
  }
  const sourceClaims = seedClaims.filter((c) => c.source_id === s.id);
  const claimsOut: CatalogClaimRow[] = sourceClaims.map((c) => ({
    id: c.id,
    lineage_id: c.lineage_id ?? c.id,
    version: c.version ?? 1,
    is_head: c.is_head ?? c.review_status === "approved",
    claim_type: c.claim_type,
    claim_category: c.claim_category,
    subject_ref: c.subject_ref,
    object_value: c.object_value,
    as_of_date: c.as_of_date,
    confidence: c.confidence,
    extractor: c.extractor ?? "human",
    review_status: c.review_status,
    reviewed_at: c.reviewed_at ?? null,
    excerpt: c.excerpt ?? null,
    audits: [],
  }));
  return {
    source: catalogSourceFromSeed(s, sourceClaims),
    claims: claimsOut,
  };
}
