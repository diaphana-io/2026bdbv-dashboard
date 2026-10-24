# Extract backend specification

**GitHub:** [diaphana-io/2026bdbv-dashboard#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) → Linear [MATT-310](https://linear.app/diaphana/issue/MATT-310/bdbv-extract-backend-specification-blocks-production-extract) (one-way sync; supersedes MATT-309)

## Summary

Define the semi-automatic Extract pipeline for curation (`curate.extractClaims`). Until decided, production stays on human claim entry + approve/reject only.

## Candidates

1. **Jev** ([jevcli](https://jevcli.vectorz.app/)) — extract field candidates + claim verification against source spans
2. jextract-style locate → pick over document chunks
3. Rule-based regex/heuristic extractors for sitrep tables
4. General LLM JSON generation (last resort; higher hallucination risk)

## Requirements

- Output must match `@bdbv/schema` Claim fields including `excerpt` span
- All outputs enter `pending_review` — never auto-approve
- Conflict detection keeps both claims visible until human resolve
- Workers-compatible or async job with R2 snapshot input
- Cost/latency budget and fallback when backend unset (`status: not_configured`)

## Acceptance

- Staging can toggle `EXTRACT_ENABLED=true` for evaluation
- Production remains `EXTRACT_ENABLED=false` until [#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) is closed with an approved design
