# 2026 Ebola (BDBV) outbreak in Africa - an interactive dashboard for case tracking

## Abstract

This repository contains the source code for an interactive surveillance web application that tracks Bundibugyo virus disease (BDBV) cases and related claims during the 2026 multi-country outbreak, with a focus on Nigeria, Kenya, and Uganda. The application presents curated epidemiological entities (cases, contacts, measures, sources), surfaces unresolved contradictions between sources, and reads from a Neo4j graph when configured, falling back to static JSON for local development. A staging deployment is available at [https://2026bdbv.diaphana.io/app](https://2026bdbv.diaphana.io/app). The project is hosted on [GitHub](https://github.com/diaphana-io/2026bdbv-dashboard) and mirrored on [Cursor Origin](https://cursor.com/codebase/tetra4rnav/2026bdbv-dashboard).

## Background

In May 2026, a high-mortality cluster in Ituri Province, Democratic Republic of the Congo, was confirmed as Bundibugyo virus disease (BVD). On 15 May the DRC declared its 17th Ebola outbreak and Uganda reported an imported case; WHO determined a PHEIC on 17 May [1](#ref-1). Sustained transmission in the DRC grew into a multi-province epidemic (Ituri epicentre). Uganda later closed its outbreak after limited imported and contact-linked cases. In October 2026 Kenya reported an imported cluster and Nigeria an imported case in Abuja, extending the event beyond the initial DRC–Uganda focus [2](#ref-2).

## Features

The web application (`apps/web`) exposes English-language views for outbreak overview, timeline, cases, contacts, map, border measures, and sources. A Curate workspace supports human review of inbox candidates, claim approval or rejection, and conflict resolution. When sources disagree, both claims remain visible until a curator resolves the conflict.

## Repository layout

```text
apps/web/          Interactive dashboard (vinext / Next.js → Cloudflare Workers)
packages/schema/   Shared TypeScript schemas for curated entities
crates/surv_*/     Rust surveillance compute (engine, epi, data, geom, wasm)
data/curated/      Human-approved production-oriented datasets
infra/             Neo4j compose and graph constraints
docs/              Operational and design notes
scripts/           Seed, verify, and provisioning helpers
```

## Architecture

The dashboard is a vinext (Next.js) application styled with Tailwind and shadcn/ui, deployed as a Cloudflare Worker under base path `/app`. Application data are modelled as a Neo4j property graph (cases, contacts, follow-up, provenance); without `NEO4J_*` environment variables the Worker serves static JSON under `apps/web/data`. Source snapshots and border-measure retrieval-augmented generation are intended to use R2 and Vectorize when those bindings are provisioned. Companion Rust crates under `crates/surv_*` provide RustGIS-inspired session and command-spec compute used by the surveillance engine.

## Data and provenance

Production reads rely on curated real-world sources (official releases and news) and human-approved claims only. Automated extract remains disabled in production until the Extract backend specification is decided ([MATT-309](https://linear.app/diaphana/issue/MATT-309/bdbv-extract-backend-specification-blocks-production-extract)). Synthetic fixtures under `seed/` support tests (`dataset=test`). When two sources assert incompatible values, both claims stay linked via `CONFLICTS_WITH` until a human chooses `resolved_a`, `resolved_b`, or `resolved_neither`.

## Getting started

```bash
npm install
npm run dev          # http://127.0.0.1:43127

# Neo4j — Aura Free (preferred) or local compose
# Full checklist: docs/neo4j-aura.md
powershell -ExecutionPolicy Bypass -File scripts/install-aura-cli.ps1
# aura-cli credential add … && aura-cli instance create --name bdbv-dashboard --type free-db --await
# Put NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD in apps/web/.env
npm run seed:neo4j
# Optional offline:
# docker compose -f infra/docker-compose.yml up -d

# Without NEO4J_*: dashboard serves static JSON under apps/web/data

cargo test --workspace
bash scripts/verify.sh scaffold   # or schema|engine|curation|all
```

## Deployment

The production host is `https://2026bdbv.diaphana.io` with the application mounted at `/app`. Curate routes are intended to sit behind Cloudflare Access; see [`docs/cloudflare-access-curate.md`](docs/cloudflare-access-curate.md). Full production extract remains blocked until the Extract specification is approved; staging may be used for evaluation in the interim.

## Development

Work proceeds on feature branches; changes reach `main` via pull request. Before each push, run the relevant commit-unit gate with `bash scripts/verify.sh <unit>` (or `all`). Deferred infrastructure and product items are tracked in [`docs/remaining-tasks.md`](docs/remaining-tasks.md); Neo4j Aura setup is documented in [`docs/neo4j-aura.md`](docs/neo4j-aura.md).

## References

1. <a id="ref-1"></a>World Health Organization. Ebola disease caused by Bundibugyo virus — Democratic Republic of the Congo & Uganda. Disease Outbreak News. 2026. Available from: https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602
2. <a id="ref-2"></a>World Health Organization. Ebola disease caused by Bundibugyo virus — Democratic Republic of the Congo, Kenya and Nigeria. Disease Outbreak News. 23 October 2026. Available from: https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622
