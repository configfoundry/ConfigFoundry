# Feature: Excel Import/Export

Parent: [[Features/Feature - Inventory Management|Feature - Inventory Management]]

## Purpose

Let teams work with inventory data offline in Excel — export current data, edit, re-import — as an alternative/complement to editing directly in the UI.

## Business value

Bulk edits, working from an existing spreadsheet during migration onto ConfigFoundry, and offline review are all easier in a spreadsheet tool than one record at a time in a web form.

## Current implementation

Export produces an `.xlsx` including custom tag columns (`GET /api/v1/export/{devices,bandwidth,subnets}.xlsx`, `formats/xlsxwriter.py`, pure Python, no external Excel library). Import is a two-step validate-then-commit flow (`.../validate-import` returns per-row errors without writing, `.../import` commits with merge or replace mode). Credential column headers are alias-tolerant (`Auth Key` / `authKey` / `AuthKey` all map to the same field). Invalid rows (bad IP/CIDR) are skipped with a reported count rather than corrupting data or failing the whole import.

## Files involved

- Backend: `api/v1/devices.py`/`bandwidth.py`/`subnets.py` (`validate-import`/`import` routes), `api/v1/export.py`, `core/services/import_service.py`, `core/services/export_service.py`, `formats/xlsxwriter.py`
- Frontend: `frontend/src/modules/inventory/ImportDialog.tsx`, client-side `xlsx` package usage in `lib/`

## User flow

Inventory -> Export -> edit offline -> Import -> review per-row validation errors -> confirm commit (merge or replace).

## Data flow

See [[Architecture/Diagrams/Data Flow|Data Flow § Excel import path]].

## Dependencies

[[Features/Feature - Inventory Management|Feature - Inventory Management]], `inventory:write` permission (see [[Security/RBAC Permission Catalog|RBAC Permission Catalog]]).

## Known limitations

Merge vs. replace semantics should be verified against current route documentation (`/docs`) before relying on either for a destructive bulk operation in production.

## Future improvements

Duplicate detection at import time (same IP, similar hostname) — v0.6.0, see [[Roadmap Overview]].

## See also

[[API Documentation/Inventory Endpoints|Inventory Endpoints]] · [[Features/Feature - Inventory Management|Feature - Inventory Management]]
