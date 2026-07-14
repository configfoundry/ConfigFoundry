# Feature: YAML Config Generation

Parent: [Repository Overview](../Repository Overview.md) · [Feature - Inventory Management](Feature - Inventory Management.md)

## Purpose

Produce monitoring platform configuration — one file per Collector Region, for whichever monitoring platform the user selects — directly from current inventory data, so config is always derived rather than hand-copied. Datadog is the first supported platform (ADR-0008); the pipeline itself has no Datadog-specific concept baked in.

## Business value

Eliminates config drift: the generated output is always a faithful reflection of current inventory at generation time, every generation is attributable (who, when, which platform) via history, and supporting a second or third monitoring platform doesn't require re-architecting this feature.

## Current implementation

The user picks a platform from the Monitoring Platforms hub (`/configuration/generate`, cards sourced from `GET /api/v1/platforms`); selecting Datadog opens the generation workflow at `/configuration/generate/datadog`. `POST /api/v1/generate` (body: `{_actor, platform}`, `platform` defaulting to `"datadog"`) reads devices, bandwidth caps, subnets, and tags through the service layer, applies subnet-based tag inheritance, builds the vendor-neutral `MonitoringConfiguration`, and hands it to the requested Platform Adapter, which maps it to that platform's own config shape and renders the output — grouped by Collector Region, with a live preview, download, and git-style diff against a previous generation in the UI. Devices configured for ICMP or SNMP Trap automatically hide the SNMPv3 credential form, live, as the Config Type changes. Every generation is recorded in `yaml_history` (actor, timestamp, platform) — nothing is written to disk server-side; the caller's deployment pipeline is responsible for placing the returned output wherever it needs to go.

## Files involved

- Backend: `api/v1/generate.py`, `api/v1/platforms.py`, `api/v1/history.py`, `core/services/generate_service.py`, `core/services/history_service.py`, `core/domain/{builder,models,helpers}.py`, `core/platforms/{base,registry}.py`, `core/platforms/datadog/{adapter,mapper,models,renderer}.py`, `core/diff.py`, `formats/yamldump.py`, `models/inventory.py::YamlHistoryModel`
- Frontend: `frontend/src/modules/platforms/PlatformsView.tsx`, `frontend/src/modules/generate/{GenerateView,CodeViewer,DiffViewer,ConfigurationTabs}.tsx`

## User flow

Choose Monitoring Platform -> (Datadog) select/confirm Collector Region(s) -> live preview -> download, or compare against a previous generation via the diff viewer -> entry appears in History.

## Data flow

See [Data Flow § Config generation path](../../architecture/Data Flow.md) and [Architecture Overview](../../architecture/Architecture Overview.md#monitoring-platform-architecture).

## Dependencies

[Feature - Inventory Management](Feature - Inventory Management.md), [Feature - Dynamic Tags](Feature - Dynamic Tags.md) (subnet inheritance feeds directly into generated output), [Feature - Audit Log & History](Feature - Audit Log & History.md).

## Known limitations

Generation is synchronous, inline in the request — no background job queue, so very large inventories generate on the request thread. Prometheus and Zabbix are registered platforms visible in the UI but not yet implemented — `PlatformAdapter.generate()` on those returns a "not implemented" `CapabilityResult` rather than output (see ADR-0008).

## Future improvements

YAML diff/change review between two generations as a first-class backend feature (v0.6.0), MIB management for human-readable OID resolution (v0.6.0). See [Roadmap Overview](../../roadmap/Roadmap Overview.md).

## Technical debt

None identified beyond the synchronous-generation scalability note above — see [Technical Debt](../../development/Technical Debt.md).

## See also

[Generate & History Endpoints](../../api/Generate & History Endpoints.md) · [Feature - Audit Log & History](Feature - Audit Log & History.md)
