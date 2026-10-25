# Curate Catalog

Browse post-Inbox **SourceDocuments** and their claim lineages. Rollback withdraws an approved Map head and re-queues a pending version for Review.

Related: versioning contracts in [extract-issue.md](./extract-issue.md); graph serving in [curate-graph-serving.md](./curate-graph-serving.md).

## IA

Pipeline (English UI): Overview → Inbox → Extract → Review → Conflicts → **Catalog** → Status.

- **List** (`/curate/catalog`): sources with `curation_status` ∈ `fetched|extracted|in_review|done` (dismissed filter default off).
- **Detail** (`?source=` id / normalized URL / URL): source timing, claims (type, subject, `as_of_date`, object, extractor, version, review_status), short audit trail.
- Review **History** links into Catalog when `?url=` is set.

## Rollback semantics (差し戻し)

Per **claim lineage**, not whole source:

1. Current approved head → `review_status: superseded`, `is_head: false` (**immediate Map withdraw**).
2. New Claim version → `pending_review`, `is_head: false`, payload from selected prior version (or current head if v1-only).
3. `(new)-[:SUPERSEDES]->(oldHead)`; history is never deleted.
4. `CurateAuditEvent` with `action: rollback` and **required** reason.

API: `POST /api/curate/rollback-claim` `{ claim_id, target_claim_id?, reason }` — requires Neo4j (503 without). Engine: `curate.rollbackClaim` for pending payload + audit shape; Web persists withdraw.

## Map contract

Public Map shows **approved head only** (`review_status: approved`). After rollback there is no approved head for that lineage until re-approve.

## Approve path

`persistReviewClaim` writes `lineage_id` / `version` / `is_head` and a `CurateAuditEvent` (`approve` | `reject`) so Catalog is not seed-only.
