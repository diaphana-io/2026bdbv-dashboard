import type { EvidenceClass, SourceKind } from "./source-enums";

/** Editable bibliographic candidate returned by fetch-source-bib. */
export type SourceBibCandidate = {
  input: string;
  identifier_kind: "url" | "doi" | "unknown";
  doi: string | null;
  url: string;
  title: string | null;
  publisher: string | null;
  kind: SourceKind;
  evidence_class: EvidenceClass;
  /** Where fields came from (crossref | url_only | stub). */
  bib_source: "crossref" | "url_only" | "stub";
  published_at: string | null;
  container_title: string | null;
};
