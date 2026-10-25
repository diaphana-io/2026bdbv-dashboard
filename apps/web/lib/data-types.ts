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

export type ConflictRow = {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  subject_ref: string;
  claim_type: string;
  status: string;
  detected_at: string;
};

export type DuplicateLevel =
  | "none"
  | "exact_url"
  | "content_hash"
  | "possible";

export type InboxRow = {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  kind: string;
  evidence_class?: string;
  duplicate_level?: DuplicateLevel;
  duplicate_of_source_id?: string | null;
  curation_status: string;
  discovered_at?: string;
};

export type ConflictView = {
  conflict: ConflictRow;
  claim_a: ClaimRow;
  claim_b: ClaimRow;
  source_a?: SourceRow;
  source_b?: SourceRow;
};

export type CaseQueryOpts = {
  country?: string;
  confirmedOnly?: boolean;
  includeTemporalSuspects?: boolean;
};

export type MapAggregate = {
  admin_iso: string;
  name: string;
  lat: number;
  lon: number;
  confirmed: number;
  deaths: number;
  as_of_date: string;
};

export type MapCase = {
  id: string;
  visual_id: string;
  admin0_iso: string;
  classification: string;
  lat: number;
  lon: number;
  date_of_onset?: string | null;
  date_of_reporting?: string | null;
};

export type MapTravelEndpoint = {
  admin_id: string;
  iso?: string;
  lat: number;
  lon: number;
};

export type MapTravel = {
  id: string;
  person_id: string;
  case_id?: string | null;
  mode: string;
  departed_at?: string | null;
  arrived_at?: string | null;
  from: MapTravelEndpoint;
  to: MapTravelEndpoint;
};

export type MapExposure = {
  from_person_id: string;
  from_visual_id?: string;
  to_case_id: string;
  to_case_visual_id: string;
  date_of_last_contact: string;
  to_lat?: number;
  to_lon?: number;
};

export type MapSnapshot = {
  asOf: string;
  aggregates: MapAggregate[];
  cases: MapCase[];
  travels: MapTravel[];
  exposures: MapExposure[];
};

export type CaseDetailEvent = {
  kind: "onset" | "reporting" | "travel" | "hospitalization" | "exposure" | "outcome";
  at: string;
  label: string;
  meta?: Record<string, unknown>;
};

export type CaseDetail = {
  id: string;
  visual_id: string;
  admin0_iso: string;
  classification: string;
  lat?: number;
  lon?: number;
  events: CaseDetailEvent[];
};

/**
 * Country-level statistics — a separate concept from summing MapCase rows
 * or MapAggregate claim counts. Do not derive these from person-level cases.
 */
export type CountryStatRow = {
  admin0_iso: string;
  name: string;
  confirmed: number;
  suspected: number;
  probable?: number;
  recovered: number;
  deceased: number;
  asOf: string;
};
