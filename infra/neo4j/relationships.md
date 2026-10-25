# Neo4j relationship types

Modeling inventory (entities, **time axes**, seed gaps): [`docs/graph-model.md`](../../docs/graph-model.md).

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
- `(Case|Person|Event|Cluster|FollowUpWindow|LabResult|BorderMeasure)-[:SUPPORTED_BY]->(Claim)`
- `(Case)-[:SOURCED_FROM]->(SourceDocument)` — case cites sources by internal id (`Case.source_ids`); UI case detail resolves these
- `(Claim)-[:FROM]->(SourceDocument)` — one source may produce many claims
- `(Claim)-[:CONFLICTS_WITH]->(Claim)` — both remain visible until ClaimConflict resolved; same `claim_type` + subject + `as_of_date`
- `(Claim)-[:SUPERSEDES]->(Claim)`
- `(ClaimConflict)-[:SIDE_A|SIDE_B]->(Claim)`

Claim nodes store `claim_type` (fine) and `claim_category` (coarse: `aggregate_count` \| `case_detail` \| `exposure_contact` \| `border_measure` \| `outbreak_status` \| `other`). Filter Map / conflict queues by `claim_category`.
- `(IngestBatch)-[:PRODUCED]->(Claim|Case|Person|SourceDocument|BorderMeasure)`
- `(AdminUnit)-[:PARENT_OF]->(AdminUnit)`
- `(BorderMeasure)-[:APPLIES_IN]->(AdminUnit)`
- `(BorderMeasure)-[:AT_POE]->(PointOfEntry)`
- `(DiscoveryRun)-[:ENQUEUED]->(SourceDocument)`

## Claim types: cumulative vs incidence

Aggregate `Claim` nodes share the same label and `FROM` edges; they differ by `claim_type` and `object_value`:

| `claim_type` | Meaning | Typical `object_value` |
| --- | --- | --- |
| `case_count` | Cumulative snapshot as of `as_of_date` | `{ confirmed, deaths, … }` |
| `incidence` | New counts over an inclusive period | `{ period_start, period_end, grain, new_confirmed, new_deaths?, metric_basis }` |

CD production path: daily `grain: "day"` with `metric_basis: "reporting_date"`, where `period_start === period_end === as_of_date`. Do not difference successive `case_count` rows to invent incidence.
