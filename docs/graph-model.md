# Graph model inventory (modeling-complete)

**Purpose:** Enumerate what the Neo4j / Zod model must cover for BDBV outbreak surveillance. **Time is a first-class axis** — almost every fact is meaningless without when it applies.

**Canonical edges:** [`infra/neo4j/relationships.md`](../infra/neo4j/relationships.md) · **Constraints:** [`infra/neo4j/constraints.cypher`](../infra/neo4j/constraints.cypher) · **Curate / Claim policy docs:** private `diaphana-io/2026bdbv-curate` (see [`curate.md`](./curate.md))

## 1. Time axes (do not conflate)

| Axis | Typical fields | Meaning |
|------|----------------|---------|
| **Epidemiological cut** | Claim / BorderMeasure `as_of_date` | “Numbers / rules as of this day” — Map heads, conflict key, aggregate series |
| **Event time** | onset, last contact, departed/arrived, admitted | When something happened to a person/case |
| **Administrative time** | classification_date, reporting, isolation, outcome | When authorities recorded a state change |
| **Validity interval** | FollowUp `window_start`/`window_end`; measure `effective_from`/`effective_to` | Inclusive period a state is active |
| **Document time** | Source `published_at`, `retrieved_at`, `discovered_at` | When the article appeared / we saw it — **not** the fact cut |
| **Lineage time** | Claim `version`, `SUPERSEDES`, audit `from_version`/`to_version` | Append-only revisions of the same logical claim |
| **Ops time** | conflict `detected_at`/`resolved_at`, review `reviewed_at` | Curation workflow |

Rules:

1. Never default claim `as_of_date` from source `published_at` (Curate conflict policy lives in private `2026bdbv-curate`).
2. Aggregate Map queries are **as-of slices**: latest approved claim head with `as_of_date ≤ query day`.
3. Individual timelines are **event sequences** (onset → travel → isolation → outcome), not a single date.
4. One SourceDocument can assert many claims with **different** `as_of_date` values.

```text
Query "show as of D"
  ├─ aggregates: Claim(category=aggregate_count, as_of≤D, approved head)
  ├─ cases: Case with onset/reporting ≤ D (and still in window)
  ├─ travels / exposures: event_at ≤ D
  └─ measures: effective_from ≤ D ∧ (effective_to is null ∨ effective_to ≥ D)
```

## 2. Entity catalog

Status: **seeded** = in `data/seed/curated` + `scripts/seed-neo4j.mjs` · **neo4j** = constraint only · **zod** = `packages/schema` · **empty** = designed, not populated.

Approx seed sizes today: Outbreak 1 · AdminUnit 4 (admin0) · Case 6 · Contact persons 3 · Source 4 (+ inbox) on Neo4j for Case citation · TravelLeg 3 · Hospitalization 3 · BorderMeasure 3 · FollowUpWindow via contacts. **Claims / conflicts seed into D1** (`seed:d1-curate`), not Neo4j (Phase 5).

### 2.1 Geography & places

| Label | Purpose | Key temporal | Status |
|-------|---------|--------------|--------|
| **AdminUnit** | Country / province / … (`tracking_mode`: individual \| aggregate) | place durable; timed facts live on claims/cases | seeded (admin0 only; no `PARENT_OF`) |
| **Facility** | Hospital, lab, ETU | open/close later if needed | neo4j empty (hosp uses `facility_name` string) |
| **PointOfEntry** | Airport / land border | — | neo4j empty (measure `poe` string only) |

Reported country vs residence / origin: **same AdminUnit type**, different edges (`DETECTED_IN` vs `RESIDES_IN`), plus Case.`admin0_iso` denormalized for Map. Nationality (if needed) is a separate Person attribute or `NATIONAL_OF` edge — not yet modeled; do not overload `RESIDES_IN`.

### 2.2 Outbreak & people

| Label | Purpose | Key temporal | Status |
|-------|---------|--------------|--------|
| **Outbreak** | Whole event | `declared_at`, `ended_at`, incubation bounds | seeded (Zod gap: no OutbreakSchema) |
| **Person** | Human (`role`: case \| contact \| …) | `date_of_reporting` | seeded |
| **Case** | Case episode under a Person | onset, reporting, classification_date; seed also isolation / outcome | seeded (Zod lag vs curated JSON) |
| **Cluster** | Transmission cluster | start/end optional | neo4j empty |
| **Event** | Funeral / gathering exposure | occurrence date | neo4j empty |

Case↔Person: `(Person)-[:HAS_CASE]->(Case)`; contact becoming case: `BECAME_CASE` (unused). Generation: curated `generation` int; `GENERATION_OF` edge unused.

### 2.3 Contacts, exposure, follow-up

Contact possibility is an **interval** (not a single day):

| Field | Meaning |
|-------|---------|
| `date_of_first_contact` | Day contact possibility **began** (inclusive) |
| `date_of_last_contact` | Day contact possibility **ended** (inclusive) |

Same-day exposure → set both equal. Follow-up (`FollowUpWindow`) starts from **`date_of_last_contact`** when `Outbreak.followup_starts_on_last_contact` is true — not from first.

| Label / edge | Purpose | Key temporal | Status |
|--------------|---------|--------------|--------|
| **EXPOSED_TO** | Person → Case\|Person\|Event | **first + last** possibility dates | seeded as **rel props** (Exposure Zod entity not a node) |
| **FollowUpWindow** | 21-day monitoring | `window_start` ← last contact; `window_end` | seeded |
| **FollowUpDay** | Daily check | calendar day + symptoms | neo4j empty |

### 2.4 Travel, care, lab

| Label | Purpose | Key temporal | Status |
|-------|---------|--------------|--------|
| **TravelLeg** | Movement | `departed_at`, `arrived_at` | seeded (AdminUnit ends only) |
| **Hospitalization** | Admission spell | `admitted_at`, `discharged_at` | seeded |
| **LabResult** | Test result | specimen / result datetime | neo4j empty |

### 2.5 Border & measures

| Label | Purpose | Key temporal | Status |
|-------|---------|--------------|--------|
| **BorderMeasure** | Screening, bans, quarantine | **`as_of_date`** + effective interval; `supersedes_id` | seeded (`APPLIES_IN` / `AT_POE` unused) |

### 2.6 Evidence & curation (time-stamped truth)

| Label | Purpose | Key temporal | Status |
|-------|---------|--------------|--------|
| **SourceDocument** | Document (internal UUID); Neo4j copy for Case `SOURCED_FROM` | published / retrieved / discovered | seeded on Neo4j (Case citation) + D1 (Curate) |
| **Claim** | Atomic assertion + `claim_category` | **`as_of_date`**, version / lineage | **D1 SoT** (Phase 5); not seeded to Neo4j |
| **ClaimConflict** | Incompatible pair | detected / resolved | **D1 SoT** |
| **DismissedSource** | Rejected inbox URL | dismissal time | D1 (+ optional Neo4j constraint) |
| **DiscoveryRun** | Discover job | run time | neo4j empty / future D1 jobs |
| **IngestBatch** | Import batch | batch time | neo4j empty |
| **CurateAuditEvent** | Approve / revise / rollback | event time + versions | **D1 SoT** |

`(Case)-[:SOURCED_FROM]->(SourceDocument)` cites sources by **internal id** on Neo4j. Claim→source links are D1 `claims.source_id` (no Neo4j `FROM`).

**Out of product scope for now:** vaccines / therapeutics / ring vaccination (not labeled).

## 3. Modeling-complete checklist (time-aware)

Use this as the fill-order for seed / Extract / Curate — every row must have its time fields filled or explicitly null.

### A. Geography
- [ ] Admin0 (+ needed Admin1) with `tracking_mode`
- [ ] `PARENT_OF` hierarchy where subnational used
- [ ] Facility / POE nodes when travel or hospitalization names must resolve to ids

### B. Outbreak envelope
- [ ] Outbreak `declared_at` / `ended_at` / incubation / follow-up duration
- [ ] `INCLUDES_ADMIN` for affected countries

### C. Individual epi timeline (per case)
- [ ] Person + Case linked
- [ ] Event times: onset, reporting, classification, isolation, outcome (align CaseSchema with seed)
- [ ] Place roles: detected vs resides (edges, not duplicate country types)
- [ ] `source_ids` / `SOURCED_FROM` (internal UUIDs)
- [ ] Optional: generation, cluster, HCW flag

### D. Contact & follow-up timeline
- [ ] Exposure with **both** possibility dates (`date_of_first_contact` ≤ `date_of_last_contact`)
- [ ] FollowUpWindow derived from **last** contact + incubation_max
- [ ] Daily FollowUpDay when operational tracking is in scope
- [ ] `BECAME_CASE` when contact converts

### E. Mobility & care timeline
- [ ] TravelLeg ordered by departed/arrived
- [ ] Hospitalization intervals
- [ ] LabResult timed (when lab layer is on)

### F. Aggregate time series (esp. CD / aggregate admins)
- [ ] Claim `aggregate_count` series per subject with **monotonic or versioned `as_of_date`**
- [ ] Suspected vs confirmed as separate types/fields (not one mashed number)
- [ ] Map read: as-of ≤ D head only

### G. Measures timeline
- [ ] BorderMeasure with as_of + effective interval
- [ ] Supersession chain when rules change

### H. Evidence timeline
- [ ] Source published_at ≠ claim as_of_date
- [ ] Multi-claim per source
- [ ] Conflicts only on same type+subject+**as_of**
- [ ] Audit / SUPERSEDES for revisions

## 4. Known gaps (schema vs seed vs product)

| Gap | Why it matters temporally |
|-----|---------------------------|
| Case Zod vs curated JSON drift (`date_of_isolation`, `date_of_outcome`, `generation`, `place_of_death`, …) | Typed API / Case detail timeline incomplete |
| `DETECTED_IN` / `RESIDES_IN` / `DIED_IN` unused | Cannot reconstruct place roles over time (props only) |
| Facility / POE / LabResult empty | Care & border timelines stay stringly |
| FollowUpDay + `BECAME_CASE` unused | No day-level contact curve; conversion not a graph fact |
| `GENERATION_OF` / Cluster unused | Infection-chain timeline is an int, not edges |
| Claim `SUPERSEDES` / lineage unused in seed | Aggregate series risk colliding instead of versioning |
| `SUPPORTED_BY` unused | Cannot replay “which claim justified this case on day D” |
| Exposure is edge props, not Exposure nodes | Harder to id / audit a single exposure over time |
| No nationality / citizenship field | Origin ≠ residence ≠ reporting |
| CurateAuditEvent / IngestBatch / DiscoveryRun thin | Ops chronology of how data arrived |
| Admin1+ / `PARENT_OF` unused | CD epicentre time series stuck at admin0 claims |

## 5. Minimum “time-series ready” for Map + Curate

For the dashboard to answer “what did we know as of D?” without lying:

1. Every aggregate Claim has `as_of_date` + approved head / SUPERSEDES.  
2. Every Case has onset or reporting (at least one event time).  
3. Every exposure has `date_of_first_contact` and `date_of_last_contact` (possibility began / ended); FollowUpWindow from last contact.  
4. Source `published_at` stored separately from claim cuts.  
5. Case `source_ids` resolve to SourceDocument for the detail panel.  
6. BorderMeasure queryable by effective interval overlapping D.

Anything outside that list can wait; anything inside it is **modeling-required**.
