/** Mirrors `@bdbv/schema` SourceKind + EvidenceClass (web has no schema dep). */

export const SOURCE_KINDS = [
  "official_don",
  "official_moh",
  "sitrep",
  "news",
  "travel_advisory",
  "other",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const EVIDENCE_CLASSES = [
  "intl_org",
  "national_official",
  "academic",
  "news",
  "travel_advisory",
  "ngo_grey",
  "other",
] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export function isSourceKind(value: string): value is SourceKind {
  return (SOURCE_KINDS as readonly string[]).includes(value);
}

export function isEvidenceClass(value: string): value is EvidenceClass {
  return (EVIDENCE_CLASSES as readonly string[]).includes(value);
}
