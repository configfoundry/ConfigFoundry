# Feature: Inventory Management

Parent: [[Repository Overview]] · [[Architecture/Diagrams/User Journey|User Journey]]

## Purpose

Full CRUD for devices, bandwidth caps, and subnets — the canonical inventory that everything else (tags, generation, export) is built on.

## Business value

Replaces a hand-maintained spreadsheet with a shared, validated, multi-user dataset — no per-person copies to reconcile, no "whose version is current." See [[Repository Overview#Business problem solved]].

## Current implementation

Sortable table view and card view, instant client-side search, pagination (10/25/50/100/All, preference remembered), responsive down to mobile. Client-side and server-side IP/CIDR validation (`core/validator.py`) so a bad value can't enter through the API directly. Excel import/export with alias-tolerant credential column headers and a validate-then-commit two-step import flow.

## Files involved

- Backend: `api/v1/devices.py`, `api/v1/bandwidth.py`, `api/v1/subnets.py`, `core/services/device_service.py`, `core/services/bandwidth_service.py`, `core/services/subnet_service.py`, `core/services/import_service.py`, `core/validator.py`, `models/inventory.py`
- Frontend: `frontend/src/modules/inventory/{InventoryView,DevicesView,BandwidthView,SubnetsView,DeviceFormDrawer,BandwidthFormDrawer,SubnetFormDrawer,ImportDialog,TemplatesView}.tsx`

## User flow

Log in -> Inventory -> browse/search/sort a table -> add/edit via a form drawer, or Excel import (validate -> review errors -> commit) -> changes reflected immediately, recorded in the audit log.

## Data flow

See [[Architecture/Diagrams/Data Flow|Data Flow § Inventory write path]] and [[Architecture/Diagrams/Data Flow|Data Flow § Excel import path]].

## Dependencies

[[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]] (tag columns render inline in these tables), [[Features/Feature - YAML Config Generation|Feature - YAML Config Generation]] (consumes this data), [[Security/RBAC Permission Catalog|RBAC Permission Catalog]] (`inventory:read`/`inventory:write`).

## Known limitations

- **Not a CMDB** — tracks only the fields needed for monitoring config generation (IP, region, credentials, a handful of tags), not ownership, lifecycle, warranty, or broader asset relationships.
- **Single shared database, last-write-wins.** With SQLite (the default), two people editing the same record simultaneously has no optimistic-locking or conflict warning. Not battle-tested under heavy concurrent write load — move to PostgreSQL if that matters (see [[Database Overview]]).
- **No foreign-key-enforced relationships** between devices/subnets/bandwidth at the schema level — see [[Database Overview#Future schema improvements]].
- Frontend route duplication (`inventory/` vs `infrastructure/`) suggests an in-progress migration state — see [[Development/Technical Debt|Technical Debt]].

## Future improvements

Duplicate detection at import time (same IP, similar hostname), device templates for common device types, an Inventory Health Dashboard (stale entries, coverage gaps), and cross-field "Inventory Validation Engine" checks (e.g. a device referencing a nonexistent subnet) — all targeted at v0.6.0, see [[Roadmap Overview]].

## Technical debt

See [[Development/Technical Debt|Technical Debt]] for the frontend route duplication and the JSON-blob (vs. normalized-column) schema design.

## See also

[[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]] · [[Features/Feature - Excel Import Export|Feature - Excel Import Export]] · [[API Documentation/Inventory Endpoints|Inventory Endpoints]]
