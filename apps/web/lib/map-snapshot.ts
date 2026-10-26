/**
 * Hybrid map snapshot helpers (Phase 4): D1 case_count claims joined to
 * AdminUnit geo; Case / Travel / Exposure graph stays Neo4j (or JSON).
 */
import type {
  ClaimRow,
  MapAggregate,
  MapCase,
  MapExposure,
  MapSnapshot,
  MapTravel,
} from "./data-types";

export type AggregateAdminUnit = {
  iso: string;
  name: string;
  lat: number;
  lon: number;
};

export type MapSnapshotGraph = {
  cases: MapCase[];
  travels: MapTravel[];
  exposures: MapExposure[];
};

/** Join approved case_count claims to AdminUnit lat/lon by subject_ref = iso. */
export function joinCaseCountClaimsToAdminUnits(
  claims: ClaimRow[],
  units: AggregateAdminUnit[],
): MapAggregate[] {
  const byIso = new Map(units.map((u) => [u.iso, u]));
  const aggregates: MapAggregate[] = [];
  for (const claim of claims) {
    const unit = byIso.get(claim.subject_ref);
    if (!unit) continue;
    aggregates.push({
      admin_iso: unit.iso,
      name: unit.name,
      lat: unit.lat,
      lon: unit.lon,
      confirmed: Number(claim.object_value.confirmed ?? 0),
      deaths: Number(claim.object_value.deaths ?? 0),
      as_of_date: claim.as_of_date,
    });
  }
  return aggregates;
}

export function composeMapSnapshot(
  asOf: string,
  aggregates: MapAggregate[],
  graph: MapSnapshotGraph,
): MapSnapshot {
  return {
    asOf,
    aggregates,
    cases: graph.cases,
    travels: graph.travels,
    exposures: graph.exposures,
  };
}
