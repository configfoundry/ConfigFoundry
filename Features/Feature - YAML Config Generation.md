# Feature: YAML Config Generation

Parent: [[Repository Overview]] · [[Features/Feature - Inventory Management|Feature - Inventory Management]]

## Purpose

Produce SNMP/ICMP collector configuration YAML — one file per Collector Region — directly from current inventory data, so config is always derived rather than hand-copied.

## Business value

Eliminates config drift: the generated output is always a faithful reflection of current inventory at generation time, and every generation is attributable (who, when) via history.

## Current implementation

`POST /api/v1/generate` reads devices, bandwidth caps, subnets, and tags through the service layer, applies subnet-based tag inheritance, groups output by Collector Region, and returns YAML with a live preview and download in the UI. Devices configured for ICMP or SNMP Trap automatically hide the SNMPv3 credential form, live, as the Config Type changes. Every generation is recorded in `yaml_history` (actor + timestamp) — nothing is written to disk server-side; the caller's deployment pipeline is responsible for placing the returned YAML wherever it needs to go.

## Files involved

- Backend: `api/v1/generate.py`, `api/v1/history.py`, `core/services/generate_service.py`, `core/services/history_service.py`, `core/logic.py` (`convert_to_collector_configs`), `core/diff.py`, `formats/yamldump.py`, `models/inventory.py::YamlHistoryModel`
- Frontend: `frontend/src/modules/generate/{GenerateView,CodeViewer,DiffViewer,ConfigurationTabs}.tsx`

## User flow

Generate YAML -> select/confirm Collector Region(s) -> live preview -> download, or compare against a previous generation via the diff viewer -> entry appears in History.

## Data flow

See [[Architecture/Diagrams/Data Flow|Data Flow § Config generation path]].

## Dependencies

[[Features/Feature - Inventory Management|Feature - Inventory Management]], [[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]] (subnet inheritance feeds directly into generated output), [[Features/Feature - Audit Log & History|Feature - Audit Log & History]].

## Known limitations

Generation is synchronous, inline in the request — no background job queue, so very large inventories generate on the request thread. `history` records *that* a generation happened and by whom, but not a structured *diff* of what changed between two generations (the `DiffViewer` component exists in the frontend; verify whether it computes the diff client-side from two fetched YAML blobs or the backend provides one — worth confirming during a code review pass).

## Future improvements

YAML diff/change review between two generations as a first-class backend feature (v0.6.0), MIB management for human-readable OID resolution (v0.6.0). See [[Roadmap Overview]].

## Technical debt

None identified beyond the synchronous-generation scalability note above — see [[Development/Technical Debt|Technical Debt]].

## See also

[[API Documentation/Generate & History Endpoints|Generate & History Endpoints]] · [[Features/Feature - Audit Log & History|Feature - Audit Log & History]]
