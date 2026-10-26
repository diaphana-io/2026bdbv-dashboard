# Neo4j relationship types

Modeling inventory (entities, **time axes**, seed gaps): [`docs/graph-model.md`](../../docs/graph-model.md).

Claim / ClaimConflict / CurateAuditEvent and Claim `FROM` / conflict edges are **D1 tabular SoT** after [Phase 5](../../docs/claim-d1-migration.md). Neo4j keeps `SourceDocument` for Case citation only.

- `(Outbreak)-[:INCLUDES_ADMIN]->(AdminUnit)`
- `(Person)-[:HAS_CASE]->(Case)`
- `(Case)-[:IN_OUTBREAK]->(Outbreak)`
- `(Case)-[:IN_CLUSTER]->(Cluster)`
- `(Case)-[:DETECTED_IN|RESIDES_IN|DIED_IN]->(AdminUnit)`
- `(Case)-[:ADMITTED_TO|ISOLATED_AT|TESTED_AT]->(Facility)`
- `(Case)-[:HAS_LAB]->(LabResult)`
- `(Case)-[:HAS_HOSPITALIZATION]->(Hospitalization)`
- `(Person)-[:TRAVELED]->(TravelLeg)-[:FROM|TO]->(AdminUnit|PointOfEntry)`
- `(Person)-[:EXPOSED_TO]->(Case|Person|Event)` — edge props: `date_of_first_contact` (possibility began) and `date_of_last_contact` (possibility ended); follow-up starts from last when Outbreak.followup_starts_on_last_contact
- `(Person)-[:HAS_FOLLOWUP_WINDOW]->(FollowUpWindow)`
- `(FollowUpWindow)-[:HAS_DAY]->(FollowUpDay)`
- `(Person)-[:BECAME_CASE]->(Case)`
- `(Case)-[:GENERATION_OF]->(Case)`
- `(Event)-[:OCCURRED_IN]->(AdminUnit)`
- `(Case)-[:SOURCED_FROM]->(SourceDocument)` — case cites sources by internal id (`Case.source_ids`); UI case detail resolves these. Claim→Source links live in D1 (`claims.source_id`), not Neo4j `FROM`
- `(IngestBatch)-[:PRODUCED]->(Case|Person|SourceDocument|BorderMeasure)`
- `(AdminUnit)-[:PARENT_OF]->(AdminUnit)`
- `(BorderMeasure)-[:APPLIES_IN]->(AdminUnit)`
- `(BorderMeasure)-[:AT_POE]->(PointOfEntry)`
- `(DiscoveryRun)-[:ENQUEUED]->(SourceDocument)`

## Claim aggregates (D1, not Neo4j)

Zone1 count assertions (`case_count`, `incidence`, …) and conflicts/audit are stored in Cloudflare D1. See [`docs/claim-d1-migration.md`](../../docs/claim-d1-migration.md). Map joins approved D1 `case_count` rows to Neo4j `AdminUnit` geo; Case / Travel / Exposure graph layers stay Neo4j without Claim MATCH.
