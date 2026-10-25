/** Mirrors `@bdbv/schema` ClaimCategory + claimCategoryForType (web has no schema dep). */
export const CLAIM_CATEGORIES = [
  "aggregate_count",
  "case_detail",
  "exposure_contact",
  "border_measure",
  "outbreak_status",
  "other",
] as const;

export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];

export function claimCategoryForType(claimType: string): ClaimCategory {
  switch (claimType) {
    case "case_count":
    case "death_count":
    case "contact_count":
    case "hospitalization_count":
      return "aggregate_count";
    case "case_travel":
    case "case_lab":
    case "case_outcome":
    case "case_identity":
      return "case_detail";
    case "exposure":
    case "contact_followup":
      return "exposure_contact";
    case "border_measure":
    case "travel_advisory":
      return "border_measure";
    case "outbreak_declared":
    case "outbreak_ended":
    case "pheic":
      return "outbreak_status";
    default:
      return "other";
  }
}

export function isClaimCategory(value: string): value is ClaimCategory {
  return (CLAIM_CATEGORIES as readonly string[]).includes(value);
}
