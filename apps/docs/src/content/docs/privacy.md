---
title: Privacy Policy
description: How the 2026 BDBV outbreak dashboard uses first-party cookies and browser storage.
---

This page describes how the [interactive dashboard](https://2026bdbv.diaphana.io/app) and this documentation site store small amounts of data in your browser. We do not use advertising or third-party analytics cookies.

## Cookies

| Name | Purpose |
| --- | --- |
| `sidebar_state` | Remembers whether the map or Curate sidebar is open or closed. |
| `bdbv_curate_data_source` | Curate-only preference for which data source the UI reads (for example static JSON vs live bindings). |

When [Cloudflare Access](https://www.cloudflare.com/products/zero-trust/access/) protects Curate routes, Cloudflare may also set its own authentication cookies so authorized users stay signed in. Those cookies are controlled by Cloudflare, not by this application’s code.

## localStorage

The map UI may keep preferences in `localStorage` under keys such as `bdbv-map-ui-v8` (older versions may exist briefly during upgrades). Typical values include layer visibility, basemap choice, and font size.

**Panel positions and sizes** are written only when you turn on **Save Panel Positions** in map Settings. Until then, drag and resize stay in the current session and are not persisted. **Reset Panel Positions** clears the saved layout.

## What we do not collect here

- No advertising or marketing trackers.
- No third-party analytics cookies from this application.
- Outbreak case data shown on the map come from curated sources; that is not personal data about you as a visitor.

## Contact

Questions about this project: see [About](/docs/about/) or the repository [diaphana-io/2026bdbv-dashboard](https://github.com/diaphana-io/2026bdbv-dashboard).
