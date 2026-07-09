# Feature: Audit Log & History

Parent: [[Repository Overview]] · [[Security/Security Overview|Security Overview]]

## Purpose

Two related but distinct records: the **audit log** (who changed what, security + business events) and **YAML generation history** (what was generated, by whom, when).

## Business value

Attributability and reviewability — a hard requirement for the regulated environments this targets, and directly evidenced against SOC 2 controls (see [[Security/SOC 2 Compliance Mapping|SOC 2 Compliance Mapping]]).

## Current implementation

Every security-relevant event and business mutation is recorded via `AuditRepository.log(...)` — write-once, no update/delete API surface. Queryable via `GET /api/v1/audit` (recent) and `GET /api/v1/audit/search` (filtered by actor/date-range/resource-type/result), requires `audit:read`. Every config generation is recorded in `yaml_history`, queryable via `GET /api/v1/history` / `GET /api/v1/history/{id}`, requires `profile:read`.

## Files involved

- Backend: `api/v1/audit.py`, `api/v1/history.py`, `core/services/audit_service.py`, `core/services/history_service.py`, `core/repositories/sqlalchemy/audit.py`, `models/inventory.py::AuditLogModel`/`YamlHistoryModel`
- Frontend: `frontend/src/modules/administration/AuditLogsView.tsx`

## User flow

Administration -> Audit Logs -> filter by actor/date/resource/result -> investigate "who changed this bandwidth cap" or "why did this generation fail." History -> Generate YAML -> view/compare past generations.

## Data flow

`audit_log` is a single table shared by both business-object changes and security events — extended with nullable columns rather than duplicated. See [[Database Overview]].

## Dependencies

Every mutating service call across the codebase (audit is a cross-cutting concern, not tied to one feature).

## Known limitations

Nothing is auto-purged — a deliberate default (nothing disappears without an explicit action), but plan storage growth accordingly for compliance retention requirements. No retention policy or export tooling yet.

## Future improvements

Retention policies and export tooling — v0.7.0. See [[Roadmap Overview]].

## Technical debt

None beyond the storage-growth planning note above.

## See also

[[Security/SOC 2 Compliance Mapping|SOC 2 Compliance Mapping]] · [[API Documentation/Export & Audit Endpoints|Export & Audit Endpoints]] · [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]]
