# Generate & History Endpoints

Parent: [API Overview](API Overview.md) · [Feature - YAML Config Generation](../reference/features/Feature - YAML Config Generation.md)

Routers: `api/v1/generate.py`, `api/v1/platforms.py`, `api/v1/history.py`. Requires `deployment:execute` / `meta:read` / `profile:read`.

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/platforms` | List registered monitoring platforms (id, name, status, icon, ...) for the Monitoring Platforms hub | `meta:read` |
| `POST` | `/api/v1/generate` | Generate monitoring configuration from current inventory for one platform, one file per Collector Region | `deployment:execute` |
| `GET` | `/api/v1/history` | List past generations | `profile:read` |
| `GET` | `/api/v1/history/{entry_id}` | Get one generation's full output | `profile:read` |

## Request/response notes

`POST /api/v1/generate` body is `{_actor, platform}` -- `platform` is optional and defaults to `"datadog"`, so pre-ADR-0008 callers that don't send it are unaffected. It reads devices, bandwidth caps, subnets, and tags through the service layer, applies subnet-based tag inheritance, builds the vendor-neutral `MonitoringConfiguration`, and hands it to the requested Platform Adapter (`core/platforms/registry.py`) -- returns `404` for an unknown `platform` id, `409` if the platform is registered but not yet `"supported"` (e.g. Prometheus, Zabbix). Output is returned directly in the response -- nothing is written to disk server-side. Every generation is recorded in `yaml_history` (actor, timestamp, platform), so config drift is attributable via history even though the file itself isn't persisted server-side. See [Data Flow](../architecture/Data Flow.md) and [Architecture Overview](../architecture/Architecture Overview.md#monitoring-platform-architecture) for the full pipeline.

## Errors

`403` missing `deployment:execute` (or `meta:read` for `/platforms`); `404` unknown platform id; `409` platform registered but not supported yet; `422` if inventory data fails generation-time validation.

## Dependencies

`core/services/generate_service.py`, `core/services/history_service.py`, `core/domain/builder.py::build_monitoring_configuration`, `core/platforms/registry.py`, `core/platforms/datadog/{adapter,mapper,renderer}.py`, `formats/yamldump.py`.

## See also

[Feature - YAML Config Generation](../reference/features/Feature - YAML Config Generation.md) · [Feature - Audit Log & History](../reference/features/Feature - Audit Log & History.md)
