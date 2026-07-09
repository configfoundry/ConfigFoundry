# Integrations Overview

Parent: [[Repository Overview]] · [[Architecture Overview]]

> [!IMPORTANT]
> Documented accurately against the current codebase: **no business-logic integrations (Datadog config push, NetBox sync, LDAP auth, SNMP discovery, ServiceNow, Slack, PowerDNS, Cloudflare, SNMP polling, etc.) are implemented today.** The one real, already-wired integration is **Datadog APM/observability instrumentation** (tracing, log correlation, profiling) — see [[Integrations Documentation/Datadog APM|Datadog APM]] — which is a different thing from the business-integration contract described below. If your source of truth for this project (a requirements doc, a sales deck, etc.) lists SNMP, PowerDNS, Cloudflare, or SQL Server as "integrations," see the notes at the bottom of this page for where those actually live in this codebase.

## The `integrations/` directory

Currently contains only a `README.md` — an **architectural contract** for integrations that don't exist yet. `core/`, `formats/`, and `server.py` must never import from `integrations/`; the dependency arrow points one way only. Every future integration must:

1. Be optional — removing it must not affect the server, API, database, or frontend.
2. Never be imported by core.
3. May import core (`core.storage`, `core.logic`, `formats.yamldump`, etc.) — reads inventory, writes back only through the documented storage API.
4. May use third-party libraries freely (core is stdlib-only; integrations are not).
5. Guard every third-party import with `try/except ImportError` and a clear, actionable message.
6. Never redefine the inventory model — extend it, never shadow it.
7. Be a self-contained sub-package: `integrations/<name>/{__init__.py, ..., README.md}`.
8. Never crash the server — failures (missing dep, unreachable API, bad creds) must be caught and logged, not propagated to the HTTP layer.

## Planned integrations (from the contract's own examples + [[Roadmap Overview]])

| Integration | Purpose | Roadmap version |
|---|---|---|
| `datadog/` (business-logic push, distinct from the APM instrumentation already present) | Push generated YAML configs directly to the Datadog API | v0.6.0 |
| `netbox/` | Sync device inventory with a NetBox CMDB | Unscheduled |
| `snmp_discovery/` | Walk a subnet via SNMP, propose new device additions | Unscheduled |
| `ldap/` | Authenticate/authorize users against LDAP/AD | v0.7.0 (alongside broader SSO/OIDC) |
| `servicenow/` | Import/export CMDB records | Unscheduled |
| `slack/` | Post generation summaries and audit events | Unscheduled |
| `grafana/` | Generate Grafana datasource/dashboard provisioning files | Unscheduled |
| `opentelemetry/` | Emit inventory-change events as OTel spans | Unscheduled |
| `prometheus/` | Expose inventory metrics for scraping | v0.6.0 (as part of the `/metrics` endpoint work) |

## Notes on specific systems sometimes assumed to be "integrations" here

- **SQLite / PostgreSQL / MySQL / SQL Server** are **storage providers**, not integrations — they're part of core's own `StorageProvider` abstraction (`core/storage/`), not the optional `integrations/` layer. See [[Database Overview]] and [[Backend/Storage Abstraction|Storage Abstraction]].
- **SNMP** appears only as the *subject matter* the generated collector YAML configures (ConfigFoundry generates SNMP/ICMP collector configs) — there is no SNMP client/poller/discovery code in this repository today. `snmp_discovery/` above is a planned, not existing, integration.
- **PowerDNS and Cloudflare** — no references exist anywhere in this codebase (source, docs, dependencies, or roadmap). If these are genuinely required, they would need to be scoped and built as new `integrations/` sub-packages following the contract above; nothing here should be read as implying they already exist.
- **Datadog** exists today, but only as observability instrumentation (traces/logs/profiling of ConfigFoundry itself), not as a business-logic "push config to Datadog" integration. See [[Integrations Documentation/Datadog APM|Datadog APM]].

## See also

[[Integrations Documentation/Datadog APM|Datadog APM]] · [[Roadmap Overview]] · [[Architecture Overview#Principles]]
