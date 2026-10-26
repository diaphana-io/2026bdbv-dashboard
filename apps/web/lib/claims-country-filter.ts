import type { MapAggregate } from "@/lib/data-types";

/** Keep aggregates for enabled country ISOs (exact match or pcode prefix). */
export function filterAggregatesForCountries(
  aggregates: MapAggregate[],
  isos: readonly string[],
): MapAggregate[] {
  if (isos.length === 0) return [];
  return aggregates.filter((a) => {
    const code = a.admin_iso;
    if (!code) return false;
    return isos.some((iso) => code === iso || code.startsWith(iso));
  });
}
