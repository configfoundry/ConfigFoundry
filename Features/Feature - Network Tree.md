# Feature: Network Tree

Parent: [[Features/Feature - Inventory Management|Feature - Inventory Management]] · [[Frontend Documentation/Frontend Overview|Frontend Overview]]

> [!WARNING]
> **Known, explicitly-tracked gap:** this feature exists only in the legacy vanilla-JS frontend (`static/`), which is fully superseded and not served once the Next.js build (`frontend/out/`) is present. The legacy frontend also predates the authentication layer — its API client sends no bearer token — so it cannot be exposed as a working fallback alongside the current one. This is the single highest-priority item in the v0.5.x stability bucket — see [[Roadmap Overview]].

## Purpose

A spatial, pan/zoom diagram of the inventory — Subnets on the left, branching to the Devices inside each, branching to that device's Bandwidth Capping rows on the right — as an alternative to browsing hundreds of devices as a flat table.

## Business value

Makes network layout visually legible at a glance for a few hundred devices, which a flat table can't do.

## Current implementation (legacy frontend only)

- Pan and zoom, Google-Maps style, with independent per-column scrolling.
- Click a card to drill in (subnet -> devices -> bandwidth rows); click the already-selected card for a details panel with an **Edit** button opening the same form used elsewhere.
- Hover to trace connector lines down to everything beneath the hovered card.
- "Unassigned" buckets for devices with no matching subnet, and bandwidth rows with no matching device — shown, not silently dropped.
- Filter with `key:value` queries (e.g. `collector_region:india`, `country:"AWS US"`) or dropdowns; filtering narrows what's shown without changing the diagram's shape.

## Files involved

`static/networktree.js` (legacy implementation) — no equivalent exists in `frontend/src/`.

## User flow

Only reachable when the app is serving the legacy frontend (no `frontend/out/` present) — not reachable in a normal `make build`/`make serve` deployment of the current UI.

## Dependencies

[[Features/Feature - Inventory Management|Feature - Inventory Management]], [[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]] (the `key:value` filter operates over tag values).

## Known limitations

Not available in the current, authenticated, actively-developed frontend at all — this is a real functional gap, not a documentation gap.

## Future improvements / technical debt

Port to the Next.js frontend — tracked as the top item in [[Roadmap Overview#v0.5.x — Stability (current)|Roadmap § v0.5.x]].

## See also

[[Roadmap Overview]] · [[Frontend Documentation/Frontend Overview|Frontend Overview]] · [[Development/Technical Debt|Technical Debt]]
