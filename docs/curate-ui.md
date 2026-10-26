# Curate UI — Claim and Case parallel tracks

**Status:** IA for human Curate. Claim track is the implementation focus; Case track is a shell in this slice.

**Related:** [conflict-resolution.md](./conflict-resolution.md), [extract-issue.md](./extract-issue.md), [curate-catalog.md](./curate-catalog.md), [claim-d1-migration.md](./claim-d1-migration.md), [graph-model.md](./graph-model.md).

## Two tracks (do not share screens)

**Claim Extract→Review→Approve and Case Extract→Review→Approve are separate screens.** Same route or form must not mix Claim and Case work. Sidebar sections are split by track.

```text
Claim track (D1 tabular)          Case track (Neo4j graph)
─────────────────────────         ─────────────────────────
Inbox ─Adopt→ Catalog             Cases (shell)
         ↓                        Case Extract (placeholder)
  Claim Extract                   Case Review (placeholder)
  Claim Review                    Case Approve (follow-up)
  Claim Approve / Reject
```

| | **Claim track** | **Case track** |
|--|-----------------|----------------|
| SoT | D1 table assertions (`claim_type`, zone/`subject_ref`, **`as_of_date`**, `object_value`, …) | Neo4j individual-case graph |
| Entry | Inbox → **Adopt** → **Catalog** | Cases (this slice: shell only) |
| Extract | **Claim Extract** (`/curate/extract`, source workspace) | **Case Extract** (`/curate/cases/extract`) |
| Review | **Claim Review** (`/curate/review`) | **Case Review** (`/curate/cases/review`) |
| Approve | Claim **Approve / Reject** only | Case Approve (follow-up; not Claim UI) |

## Terminology

| Term | Target |
|------|--------|
| **Adopt** / **Adopt anyway** | Move a source from Inbox (`candidate`) into Catalog (`fetched`). Not claim approval. |
| **Dismiss** | Leave Inbox; mark source dismissed (unchanged). |
| **Open** | Open Claim work from Catalog / queues (`/curate/source?url=` or Claim Extract/Review). |
| **Approve / Reject** | Claim rows only. Never used for source adoption. |

Do **not** use **Accept** in Curate UI or IA docs for sources or claims.

## Claim main line (this slice)

```text
Inbox (candidate)
  → Adopt source → Catalog (curation_status: fetched …)
  → Claim Extract (dedicated)
  → Claim Review (dedicated)
  → Claim Approve / Reject
```

### Sidebar (Claim)

Overview · Inbox · **Catalog** · Extract · Review · Conflicts · Status

Catalog is the post-Adopt home. Claim Extract / Review are Claim-only labels and paths (`/curate/extract`, `/curate/review`). Queues and Overview deep-links target Claim screens only.

### Source workspace

One-source Claim work may concentrate on `/curate/source?url=`:

- Extract stub (gate / `not_configured`; no Jev in this slice)
- Claims table: **type**, **zone** (`subject_ref`), **as_of**, object summary
- Approve path into Claim Review / Approve·Reject

### Claim fields (tables & forms)

Required visible fields for Claim lists and review:

- `claim_type` (type)
- zone / `subject_ref`
- `as_of_date` (as_of) — in-body epidemiological cut, never defaulted from source `published_at`
- `object_value` summary

## Case main line (this slice = shell)

- Nav under **Case**: Cases · Extract · Review
- Routes: `/curate/cases`, `/curate/cases/extract`, `/curate/cases/review`
- Placeholder copy: Case Extract→Review→Approve uses **Case-only** UI; do not reuse Claim forms
- Case edit, Case Approve API, and full Case ERA are **follow-up**

Do not put Case rows into Claim Catalog.

## Out of scope

- Case ERA implementation, Jev wiring, shared Extract screen for both tracks

## Acceptance

- [x] Docs: Claim vs Case each have their own Extract / Review / Approve screens
- [x] Claim: Adopt → Catalog → Claim Extract / Review / Approve
- [x] Case stub routes do not share Claim forms
- [x] No Accept wording; Claims tables surface as_of (and type / zone / object)
