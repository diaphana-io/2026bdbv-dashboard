# Claim conflict & duplicate handling (sample-driven)

**Status:** Policy from sample review (2026-10-24). No schema change — `resolved_both` not needed for now.

**Related:** [`extract-issue.md`](./extract-issue.md) (corroboration vs conflict), [`graph-model.md`](./graph-model.md) (full graph + **time axes**), Curate Conflicts UI (`Keep A` / `Keep B` / `Keep neither`).

## Layers (do not conflate)

| Layer | What | Curator actions today |
|-------|------|------------------------|
| **Source duplicate** | Inbox `duplicate_level`: `none` \| `exact_url` \| `content_hash` \| `possible` | Adopt / Adopt anyway / Dismiss (→ Catalog; not claim Approve) |
| **Claim conflict** | Same `subject_ref` + `claim_type` + **same claim `as_of_date`**, different `object_value` | Leave open (both visible) or `resolved_a` / `resolved_b` / `resolved_neither` |
| **Corroboration** | Same claim fingerprint across **independent** sources | Raise confidence on approve; not a conflict |
| **Versioning** | Same lineage, later claim `as_of_date` or revise | `SUPERSEDES` / approved head; not a conflict |

Map shows **approved head only**. Unresolved conflicts stay visible until a human resolves them.

## Article date vs in-source as-of (required distinction)

Never treat these as the same clock:

| Field | Owner | Meaning | Use for |
|-------|--------|---------|---------|
| **`SourceDocument.published_at`** | Source | When the **article / bulletin was published** (or first posted) | Provenance, Inbox sort, “how fresh is the document” |
| **`SourceDocument.retrieved_at` / `discovered_at`** | Source | When we fetched or found the URL | Ops / audit only |
| **`Claim.as_of_date`** | Claim | The **epidemiological cut** stated in the text (e.g. “as of 20 October…”) | Fingerprint, conflict key, Map head selection, versioning |

Rules:

1. **Conflict and fingerprint keys use claim `as_of_date` only** — never `published_at`.
2. Set `as_of_date` from the **in-body reporting date** (“as of …”, sitrep “data as of …”, MoH statement cut). If the body has no cut date, leave the claim for human fill — do **not** default `as_of_date` to `published_at`.
3. A news piece published on day *P* may still assert an official total **as of** day *A* (*A* ≤ *P*). Compare that claim to other claims with the **same *A***, not to whatever was published on *P*.
4. Two documents with different `published_at` but the same in-body cut → same `as_of_date` → corroboration or conflict on values.
5. Two cuts on different days → **versioning** (new head), even if both articles published the same calendar day.

```text
Source.published_at     = when the document appeared
Claim.as_of_date        = what day the number describes
```

## Claim category (Neo4j)

Each claim stores a coarse **`claim_category`** alongside fine **`claim_type`**. Persist both on the Neo4j `Claim` node (indexed). Use category to filter Map primary totals, conflict queues, and case-detail review without scanning free-form types.

| `claim_category` | Typical `claim_type` examples | Role |
|------------------|-------------------------------|------|
| `aggregate_count` | `case_count`, `death_count`, `contact_count` | Admin-level totals (Map heads) |
| `case_detail` | `case_travel`, `case_lab`, `case_outcome`, `case_identity` | Individual case / person atoms |
| `exposure_contact` | `exposure`, `contact_followup` | Tracing / exposure links |
| `border_measure` | `border_measure`, `travel_advisory` | POE / travel rules |
| `outbreak_status` | `outbreak_declared`, `outbreak_ended`, `pheic` | Qualitative event status |
| `other` | (unmapped) | Holding bucket |

Defaults: `claimCategoryForType(claim_type)` when the curator omits category. Conflicts still key on `claim_type` + `subject_ref` + `as_of_date` (same category usually follows).

## One article → many claims (required assumption)

A single `SourceDocument` routinely contains **multiple independent assertions**. Do not treat the document as one claim. Split by **category** as well as subject / type / as-of.

Typical contents of one sitrep / DON / news piece:

| In the same article | Model as |
|---------------------|----------|
| Country A count + Country B count | Separate claims (`subject_ref` CD vs UG vs KE …) |
| Suspected vs confirmed vs deaths vs contacts | Separate claim types / object fields (definition split) |
| Aggregate total **and** a narrative case (index travel, contacts) | Aggregate `case_count` claims **plus** case/person-backed claims when curated |
| “As of 20 Oct” for DRC and “as of 16 Oct” for Kenya in one DON | **Different `as_of_date` per claim** — still one `published_at` on the source |
| Table row per health zone + national total | Multiple claims (or scoped `subject_ref`); do not smash into one number |

Graph already allows this: many `(Claim)-[:FROM]->(SourceDocument)` edges from one source ([`infra/neo4j/relationships.md`](../infra/neo4j/relationships.md)).

Rules:

1. **Extract / human entry emits N claims per source** (`curate.extractClaims` is plural on purpose). Review and conflict run **per claim**, not per article.
2. Adopting a source in Inbox moves it to Catalog (“this document may yield claims”) — it does **not** approve every number in the body in one click.
3. Conflicts are between **claims**, so two numbers in the *same* article that disagree (e.g. prose vs table) can open a conflict with both sides `FROM` the same source; more often they are different subjects/types/`as_of_date` and must not be merged.
4. Wire / possible-dup policy still applies at **source** level; corroboration counting still uses **claim fingerprints** (exclude wire copies).
5. Case-level detail (travel legs, contacts, facility) is not a substitute for aggregate `case_count` claims — both may be curated from the same article when present.

```text
1 SourceDocument.published_at
  └─ Claim₁ (subject KE, case_count, as_of 20 Oct, …)
  └─ Claim₂ (subject NG, case_count, as_of 20 Oct, …)
  └─ Claim₃ (subject CD, case_count, as_of 20 Oct, …)
  └─ … optional case / contact assertions …
```

## Sample table (fixed)

| ID | Pair | `published_at` (article) | Claim `as_of_date` | Figures | Classification | Curator decision |
|----|------|--------------------------|--------------------|---------|----------------|------------------|
| **A** | Seed KE `case_count` (WHO DON vs news) | WHO ~23 Oct; AJ seed 22 Oct | **20 Oct** vs **21 Oct** | confirmed **9** vs **11** | Near cuts, incompatible values (seed treats as conflict) | Prefer reconcile via cuts: if news truly means a **21 Oct** cut → versioning vs 20 Oct official; if both intend the **same** cut → `open_leave` / `keep_official`. **Not** `keep_both_wanted`. Do not use article dates as the conflict key |
| **B** | Inbox possible dup — wire of MoH briefing | (candidate URL) | Inherit briefing’s in-body cut | Same briefing, different publisher | Wire / near-copy source | `not_conflict`: Adopt allowed; **exclude from corroboration counts** |
| **C1** | WHO Sitrep #2 alone (one PDF) | Sitrep publish week | Shared cut **24 May 2026** | Same doc: DRC **906 suspected**, **105 confirmed**, UG **7** confirmed | Multi-claim + definition split | `not_conflict`: **≥3 claims from one source** (CD suspected, CD confirmed, UG confirmed); not one mashed row |
| **C2** | DON-605 → Sitrep #3 | DON / sitrep publish dates | **~29 May** → **31 May** | DRC confirmed **134** → **321** | Later cut + reclassification | `not_conflict`: lineage by **`as_of_date`**, not by when WHO posted |
| **D** | Media “9552–9704” vs WHO | Media ~22–24 Oct | Align to cited cut (DON-622 body: **20 Oct**) | WHO **9704** / **4687** | Media echo of official cut | `not_conflict` if same `as_of_date` + same values. Real disagreement on the **same as_of** → like **A** |
| **E** | Kenya MoH via Tuko vs WHO DON-622 | Tuko **23–24 Oct**; DON ~23 Oct | MoH statement cut **23 Oct** vs DON Kenya “as of **20 Oct**” | **9**/1 → **9**/2 deaths | Later official cut | `not_conflict`: new head for later **`as_of_date`**. Article publish day is incidental |
| **F** | Uganda sitrep / DON chain | Various May–Jul publishes | **24 May** → **~29 May** → **28 Jun / 2 Jul** … | UG **7** → **9** → **20** | Successive cuts | `not_conflict`: lineage by **`as_of_date`** |

Sources used for C–F: [WHO AFRO Sitrep #3](https://www.afro.who.int/publications/ebola-bundibugyo-virus-disease-outbreak-democratic-republic-congo-uganda-weekly-1), [DON-622](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622), [DON-612](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON612), [Tuko / MoH second death](https://www.tuko.co.ke/kenya/644167-kenya-records-second-ebola-death-victims-relative-succumbs/), seed data under `data/curated/`.

## Decision labels

| Label | Meaning |
|-------|---------|
| `not_conflict` | Wrong tool: dup, definition split, or versioning |
| `open_leave` | Real conflict; leave `status: open` so both stay visible |
| `keep_official` / `keep_news` / `keep_neither` | Close with `resolved_a` / `resolved_b` / `resolved_neither` |
| `keep_both_wanted` | Would need a new resolve status + Map rule |

## Verdict on “accept both when equally trustworthy”

**No sample required `keep_both_wanted`.**

Equal-trust cases in the wild fell into:

1. **Not conflicts** — suspected≠confirmed, different claim `as_of_date`, or wire copies  
2. **True conflicts** — prefer leaving open (`open_leave`) or picking the official side; Map still needs a single head  

So for now:

- Do **not** add `resolved_both`
- Keep showing both sides while `open`
- Prefer official over news when closing (`keep_official`)
- Possible dups: allow both sources into the pipeline when useful, but do not double-count corroboration for wire copies
- Always record **`published_at` on the source** and **`as_of_date` on the claim** separately
- Assume **many claims per article**; review/conflict per claim, never per document blob

Revisit `resolved_both` only if a curated pair needs two Map-visible incompatible heads for the same fingerprint key (same type / subject / **claim `as_of_date`**). That did not appear in this sample set.

## Curator flowchart

```text
One SourceDocument
  └─ split into claims (per subject / type / as_of_date / case atom)
       then for each pair of claims being compared:
  ├─ first: fix dates
  │     Source.published_at  = article day (provenance only; shared by all claims from doc)
  │     Claim.as_of_date     = in-body “as of …” for THAT assertion
  ├─ same fingerprint (value + as_of_date)  → corroboration (independent sources only)
  ├─ different case definition              → not_conflict (split fields / types)
  ├─ different subject or as_of_date        → separate claims / versioning (not one conflict)
  ├─ possible / wire source dup             → Inbox Adopt; exclude from corroboration
  └─ same type+subject+as_of_date, values differ
        ├─ still reconciling                → open_leave (both visible)
        ├─ trust A or B                     → resolved_a | resolved_b
        └─ neither usable                   → resolved_neither
```

## Out of scope (this memo)

- Implementing `resolved_both` or Map dual-head display  
- Auto-detect improvements in `surv_engine` beyond existing contracts  
- Changing production Extract gate  
- UI that lists all claims extracted from one source side-by-side with `published_at` vs per-claim `as_of_date` (follow-up)
