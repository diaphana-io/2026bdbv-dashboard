# Extract / Curate workflow & Extract backend specification

**GitHub:** [diaphana-io/2026bdbv-dashboard#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) → Linear [MATT-310](https://linear.app/diaphana/issue/MATT-310/bdbv-extract-backend-specification-blocks-production-extract) (one-way sync; supersedes MATT-309)

## Summary

Define the semi-automatic Extract pipeline for curation (`curate.extractClaims`) **and** the Extract / Curate human workflow + Curate shell so Extract plugs into curator IA as a gated path. Until the backend design is decided, production stays on human claim entry + approve/reject only.

Staging / production target must keep `EXTRACT_ENABLED=false` until [#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) is closed with an approved design.

## Candidates

1. **Jev** ([jevcli](https://jevcli.vectorz.app/)) — extract field candidates + claim verification against source spans
2. jextract-style locate → pick over document chunks
3. Rule-based regex/heuristic extractors for sitrep tables
4. General LLM JSON generation (last resort; higher hallucination risk)

## Shared Workers constraint (Curate / graph SSR)

**Workers must not hold responses hostage to Bolt** — see [Curate graph serving](./curate-graph-serving.md) ([MATT-314](https://linear.app/diaphana/issue/MATT-314/bdbv-curate-graph-serving-design-workers-neo4j-avoid-1101) / [GitHub #7](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7)). Extract backends that need Neo4j must use async jobs or snapshot I/O; never await an unbounded Bolt connect on the request path.

## Requirements (Extract backend)

- Output must match `@bdbv/schema` Claim fields including `excerpt` span
- All outputs enter `pending_review` — never auto-approve
- Conflict detection keeps both claims visible until human resolve
- Workers-compatible or async job with R2 snapshot input
- Cost/latency budget and fallback when backend unset (`status: not_configured`)
- Honor the shared Bolt constraint above (no unbounded Neo4j on the Worker response path)

## Extract / Curate workflow (human path + shell)

### Context

The public Map drops the shared top `AppNav` for a map-only sidebar. Curate must own its own shell, navigation, and theme controls. Cloudflare Access remains on `/curate` + `/api/curate` — see [`docs/cloudflare-access-curate.md`](cloudflare-access-curate.md).

### In scope

- Curate layout / chrome (independent of the public Map shell)
- Human path: inbox → (manual claim entry **or** Extract) → review → conflict resolve
- Stub Extract UX until an Extract backend design is accepted
- Staging toggle UX after backend design approval (`EXTRACT_ENABLED`)

### Related

- [#7 / MATT-314](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7) (**closed**) — Workers + Neo4j graph serving (timeouts, snapshots, mutation-only writes); cite as a graph-serving constraint only — do not reopen
- Access setup: [`docs/cloudflare-access-curate.md`](cloudflare-access-curate.md)

### Still out of scope for this issue

- Implementing the chosen Extract backend end-to-end (follow-up after design approval)
- Public Map panels / basemap / layers (separate Map work)
- Reopening #7
- Full Extract product implementation beyond stub + gated plug-in design

## Acceptance

- Staging can toggle `EXTRACT_ENABLED=true` for evaluation
- Production remains `EXTRACT_ENABLED=false` until [#2](https://github.com/diaphana-io/2026bdbv-dashboard/issues/2) is closed with an approved design
- Chosen candidate documented (or explicit decision to stay human-only for longer)
- Curate shell is independent of the public Map (no shared top-bar dependency)
- Documented human workflow with Extract as a gated plug-in (stub until backend design accepted)

## Workers + Neo4j (shared constraint)

Curate graph serving (timeouts, snapshots, mutation-only writes) was tracked in [#7](https://github.com/diaphana-io/2026bdbv-dashboard/issues/7) (Linear [MATT-314](https://linear.app/diaphana/issue/MATT-314)) and is **closed**. Extract backends on Workers must still not hold job/UI responses hostage to an unresolved Bolt promise; treat #7 as the graph-serving constraint, not open work on this issue.
