/**
 * Tracked outbreak countries for map panels / boundaries.
 * Add an entry here to extend country stats + boundary coverage.
 * `color` is a flag-derived accent used by country stat cards (and map boundaries).
 */
export const TRACKED_COUNTRIES = [
  // Sky blue from the national flag
  { iso: "CD", name: "DR Congo", shortName: "DR Congo", color: "#338AF3" },
  // Red from the national flag bar
  { iso: "KE", name: "Kenya", shortName: "Kenya", color: "#BB0000" },
  // Gold/yellow from the national flag bar
  { iso: "UG", name: "Uganda", shortName: "Uganda", color: "#FCDC04" },
  // Green from the national flag
  { iso: "NG", name: "Nigeria", shortName: "Nigeria", color: "#008751" },
] as const;

export type TrackedCountryIso = (typeof TRACKED_COUNTRIES)[number]["iso"];

export function isTrackedCountryIso(value: string): value is TrackedCountryIso {
  return TRACKED_COUNTRIES.some((c) => c.iso === value);
}

export function defaultCountryStatsVisibility(): Record<
  TrackedCountryIso,
  boolean
> {
  const out = {} as Record<TrackedCountryIso, boolean>;
  for (const c of TRACKED_COUNTRIES) {
    out[c.iso] = true;
  }
  return out;
}
