# Export, Audit & Meta Endpoints

Parent: [[API Documentation/API Overview|API Overview]]

Routers: `api/v1/export.py` (`export:read`), `api/v1/audit.py` (`audit:read`), `api/v1/meta.py` (`meta:read`).

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/export/devices.xlsx` | Export devices to Excel (includes custom tag columns) | `export:read` |
| `GET` | `/api/v1/export/bandwidth.xlsx` | Export bandwidth caps to Excel | `export:read` |
| `GET` | `/api/v1/export/subnets.xlsx` | Export subnets to Excel | `export:read` |
| `GET` | `/api/v1/audit` | Recent audit log entries | `audit:read` |
| `GET` | `/api/v1/audit/search` | Filtered audit search (actor, date range, resource type, result) | `audit:read` |
| `GET` | `/api/v1/meta` | Inventory metadata/statistics (also used as a readiness probe — see [[Operations/Runbook - Monitoring & Health Checks\|Runbook - Monitoring & Health Checks]]) | `meta:read` |

## Request/response notes

Excel exports use `formats/xlsxwriter.py` (pure Python, no external Excel library dependency). Audit search backs both compliance review and day-to-day debugging ("why did this generation fail," "who changed this bandwidth cap") — see [[Features/Feature - Audit Log & History|Feature - Audit Log & History]].

## Errors

`403` missing permission. Export/audit endpoints otherwise follow the standard conventions in [[API Documentation/API Overview|API Overview]].

## Dependencies

`core/services/export_service.py`, `core/services/audit_service.py`, `core/services/meta_service.py`, `core/repositories/sqlalchemy/audit.py` (write-once — no update/delete API surface on the audit log).

## See also

[[Security/Security Overview#Audit trail|Security Overview § Audit trail]] · [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]]
