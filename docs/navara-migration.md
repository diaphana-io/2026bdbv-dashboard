# Navara map migration — data backlog

The MapLibre GL JS map has been replaced with [Navara](https://navara.world) (`@navaramap/three`). Basemap + globe, snapshot time slider, case picking, travel arcs, layer visibility, and outbreak GeoJSON layers are implemented in-app.

OpenFreeMap styles (Natural Earth native raster + Positron / Bright / Liberty / Dark / Fiord via `MapLibreStylePlugin`) are **done**. This file tracks only work that still needs **data or infrastructure**, not more map-engine wiring.

## Still needs data / infra

1. **Optional DEM / high-resolution terrain** — ellipsoid globe is enough for outbreak overview. Quantized-mesh or raster-DEM would need a hosted tileset (and likely a token).
2. **Exposure coordinate completion** — exposures without `to_lat` / `to_lon` are skipped on the map; backfill coords in the curated graph/JSON.
3. **Commercial / token-gated basemaps** — catalog is entry-addable (`native-raster` or `maplibre-style` in `basemap-style.ts`). Do not hard-code secrets; wire via env when a vendor is chosen.

## Explicitly out of scope

- Ocean GeoJSON fill (not ported; globe/ocean color is canvas + ellipsoid tint).
- Photoreal atmosphere recipe (plain ambient + ellipsoid + basemap).
- Curate / Neo4j / Access / snapshot API contract changes.
