# Extract backend specification

**GitHub:** [diaphana-io/2026bdbv-dashboard#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) → Linear [MATT-310](https://linear.app/diaphana/issue/MATT-310/bdbv-extract-backend-specification-blocks-production-extract) (one-way sync; supersedes MATT-309)

## Summary

Define the semi-automatic Extract pipeline for curation (`curate.extractClaims`). Until decided, production stays on human claim entry + approve/reject only.

## Candidates

1. **Jev** ([jevcli](https://jevcli.vectorz.app/)) — extract field candidates + claim verification against source spans
2. jextract-style locate → pick over document chunks
3. Rule-based regex/heuristic extractors for sitrep tables
4. General LLM JSON generation (last resort; higher hallucination risk)

## Shared Workers constraint (Curate / graph SSR)

**Workers must not hold responses hostage to Bolt** — see [Curate graph serving](./curate-graph-serving.md) ([MATT-314](https://linear.app/diaphana/issue/MATT-314/bdbv-curate-graph-serving-design-workers-neo4j-avoid-1101) / [GitHub #7](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7)). Extract backends that need Neo4j must use async jobs or snapshot I/O; never await an unbounded Bolt connect on the request path.

## Requirements

- Output must match `@bdbv/schema` Claim fields including `excerpt` span
- All outputs enter `pending_review` — never auto-approve
- Conflict detection keeps both claims visible until human resolve
- Workers-compatible or async job with R2 snapshot input
- Cost/latency budget and fallback when backend unset (`status: not_configured`)
- Honor the shared Bolt constraint above (no unbounded Neo4j on the Worker response path)

## Acceptance

- Staging can toggle `EXTRACT_ENABLED=true` for evaluation
- Production remains `EXTRACT_ENABLED=false` until [#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) is closed with an approved design
