# 2026 Ebola (BDBV) outbreak in Africa - an interactive dashboard for case tracking

## Abstract

This repository provides the source code for an interactive dashboard that summarizes, in a visually comprehensible way, how Bundibugyo virus disease (BDBV) has spread from regional transmission in the Democratic Republic of the Congo to other countries—particularly Uganda, Kenya, and Nigeria—during the 2026 outbreak.

## Background

In May 2026, a high-mortality cluster in Ituri Province, Democratic Republic of the Congo, was confirmed as Bundibugyo virus disease (BVD). On 15 May the DRC declared its 17th Ebola outbreak and Uganda reported an imported case; WHO determined a PHEIC on 17 May [1](#ref-1). Sustained transmission in the DRC grew into a multi-province epidemic (Ituri epicentre). Uganda later closed its outbreak after limited imported and contact-linked cases. In October 2026 Kenya reported an imported cluster and Nigeria an imported case in Abuja, extending the event beyond the initial DRC–Uganda focus [2](#ref-2).

## Features

The web application (`apps/web`) exposes English-language Map views for outbreak overview, timeline, cases, contacts, map layers, border measures, and sources. Human curation (inbox review, claim approval or rejection, conflict resolution) runs in the private Curate app; this repository only consumes approved reads for the public Map. When sources disagree, unresolved contradictions stay visible on the Map until a curator resolves them.

## Repository layout

```text
.
├── apps/
│   ├── web/              Interactive dashboard (vinext / Next.js → Cloudflare Workers)
│   └── docs/             Public outbreak info site (Astro Starlight → Cloudflare Pages, /docs)
├── packages/
│   └── schema/           Shared TypeScript schemas for curated entities
├── crates/               Rust surveillance compute (surv_*) — see crates/README.md
├── data/
│   └── seed/
│       └── curated/      Neo4j/D1 seed SoT (human-approved datasets)
├── infra/                Neo4j compose and graph constraints
├── docs/                 Operational and design notes
└── scripts/              Seed, verify, and provisioning helpers
```

## Architecture

The dashboard is a vinext (Next.js) application styled with Tailwind and shadcn/ui, deployed as a Cloudflare Worker under base path `/app`. Application data are modelled as a Neo4j property graph (cases, contacts, follow-up, provenance); without `NEO4J_*` environment variables the Worker serves static JSON under `apps/web/data`. Source snapshots and border-measure retrieval-augmented generation are intended to use R2 and Vectorize when those bindings are provisioned. Companion Rust crates under `crates/surv_*` provide RustGIS-inspired session and command-spec compute used by the surveillance engine.

## Data and provenance

Production reads rely on curated real-world sources (official releases and news) and human-approved claims only. Automated extract remains disabled in production until the Extract backend specification is decided through the project’s issue tracker (issue-based gating). When two sources assert incompatible values, both claims stay linked via `CONFLICTS_WITH` until a human chooses `resolved_a`, `resolved_b`, or `resolved_neither`.

## References

1. <a id="ref-1"></a>World Health Organization. Ebola disease caused by Bundibugyo virus — Democratic Republic of the Congo & Uganda. Disease Outbreak News. 2026. Available from: https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602
2. <a id="ref-2"></a>World Health Organization. Ebola disease caused by Bundibugyo virus — Democratic Republic of the Congo, Kenya and Nigeria. Disease Outbreak News. 23 October 2026. Available from: https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622

## For Developers

The following notes are for contributors who clone this repository to run or modify the dashboard locally. They are not required to use the deployed application.

### Getting started

```bash
npm install
npm run dev          # http://127.0.0.1:43127
```

Without `NEO4J_*`, the app serves static JSON under `apps/web/data`. For Aura Free or local Neo4j, seed, and verify gates, see [`docs/neo4j-aura.md`](docs/neo4j-aura.md) and [`docs/remaining-tasks.md`](docs/remaining-tasks.md).

```bash
# Optional graph backend
powershell -ExecutionPolicy Bypass -File scripts/install-aura-cli.ps1
# Put NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD in apps/web/.env
npm run seed:neo4j
# docker compose -f infra/docker-compose.yml up -d   # offline alternative

cargo test --workspace
bash scripts/verify.sh scaffold   # or schema|engine|curation|all
```

### Deployment

Production Map: [https://2026bdbv.diaphana.io/app](https://2026bdbv.diaphana.io/app) (`main` → `/app` base path). Non-`main` branch pushes deploy to Worker Preview URLs only (not the production hostname). Curate exists at `/curate` in private `diaphana-io/2026bdbv-curate` ([`docs/curate.md`](docs/curate.md)). Production extract remains blocked until approved. Hosting: [GitHub](https://github.com/diaphana-io/2026bdbv-dashboard); [Cursor Origin](https://cursor.com/codebase/tetra4rnav/2026bdbv-dashboard).

### Workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch, PR, verify, and issue-tracking requirements.