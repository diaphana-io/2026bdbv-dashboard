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

export type InboxRow = {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  kind: string;
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
