/**
 * Tracked outbreak countries for country-stats panel (and case/aggregate ISO).
 * DRC admin outlines come from COD-AB (`cd-admin-layer`), not this list.
 * `color` is a flag-derived accent used by stats cards.
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
  // Blue from the national flag
  { iso: "FR", name: "France", shortName: "France", color: "#002395" },
] as const;

export type TrackedCountryIso = (typeof TRACKED_COUNTRIES)[number]["iso"];

export function isTrackedCountryIso(value: string): value is TrackedCountryIso {
  return TRACKED_COUNTRIES.some((c) => c.iso === value);
}

export type StatsPanelId = `stats-${TrackedCountryIso}`;

export function statsPanelId(iso: TrackedCountryIso): StatsPanelId {
  return `stats-${iso}`;
}

export function parseStatsPanelId(id: string): TrackedCountryIso | null {
  if (!id.startsWith("stats-")) return null;
  const iso = id.slice("stats-".length);
  return isTrackedCountryIso(iso) ? iso : null;
}
