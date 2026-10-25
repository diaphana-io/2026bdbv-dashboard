# Navara map migration — data backlog

The MapLibre GL JS map has been replaced with [Navara](https://navara.world) (`@navaramap/three`). Basemap + globe, snapshot time slider, case picking, travel arcs, layer visibility, and outbreak GeoJSON layers are implemented in-app.

Basemap catalog is **dark** / **light** Papers NE ([Pax Atlas](https://github.com/eukarya-biz/navara-study-bill) stack): `addDefaultPhotorealScene()` + Re:Earth quantized-mesh terrain + [Re:Earth Papers](https://papers.reearth.land/) Natural Earth admin via `TileJsonPlugin` TileJSON. **Only Dark is selectable**; Light stays in the sidebar as a disabled radio. Theme→basemap sync is off. Legacy ids resolve to dark. Local outline GeoJSON / Esri satellite are removed.

**DRC admin boundaries** use [COD-AB (HDX)](https://data.humdata.org/dataset/cod-ab-cod) static GeoJSON (`cd_provinces` / `cd_territories` / `cd_health_zones`). Camera-height LOD (not MapLibre zoom): far → province outlines; mid → territory (+ province assist); near → health zone (+ thin territory) with optional HZ choropleth. Choropleth joins existing `MapSnapshot.aggregates.admin_iso` to `adm3_pcode` — no Neo4j / schema / seed / snapshot Cypher changes. Country-total `admin_iso: "CD"` does not match any HZ (provisional fill-less); CD admin0 aggregate points stay on the case layer. Tracked-country fill/color is removed. Attribution: © OCHA COD-AB. Regenerate: `node scripts/fetch-cod-ab-cd.mjs`.

Arc layer: batched pastel `ArclineMeshDesc` by kind + instanced cone arrow heads (`InstancedCylinderMeshDesc`). **Travel** is wired today; infection-spread arcs share the same kind/color batch API and are not implemented yet (no snapshot fields or legend UI).

This file tracks only work that still needs **data or infrastructure**, not more map-engine wiring.

## Still needs data / infra

1. **Exposure coordinate completion** — exposures without `to_lat` / `to_lon` are skipped on the map; backfill coords in the curated graph/JSON.
2. **Infection-spread arcs** — when graph edges exist, feed `kind: "spread"` into the arc layer (color slot reserved in `ARC_KIND_COLORS`); no UI/legend yet.
3. **Commercial / token-gated basemaps** — catalog is entry-addable (`papers` palette variants in `basemap-style.ts`). Do not hard-code secrets; wire via env when a vendor is chosen.
4. **Health-zone claim aggregates** — when curated claims carry adm3 codes as `AdminUnit.iso` / aggregate `admin_iso`, the near-band choropleth lights up without further map wiring.

## Explicitly out of scope

- Local ocean / world-boundary GeoJSON double-stroke (Papers `countries` + `boundary_lines` own the world outline).
- Infection-spread visualization / legend until data lands.
- Curate / Neo4j / Access / snapshot API contract changes (no infection-edge fields this round; no AdminUnit / Claim convention changes for COD-AB).
