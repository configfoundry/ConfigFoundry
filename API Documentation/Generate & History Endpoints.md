# Generate & History Endpoints

Parent: [[API Documentation/API Overview|API Overview]] · [[Features/Feature - YAML Config Generation|Feature - YAML Config Generation]]

Routers: `api/v1/generate.py`, `api/v1/history.py`. Requires `deployment:execute` / `profile:read`.

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `POST` | `/api/v1/generate` | Generate collector YAML from current inventory, one file per Collector Region | `deployment:execute` |
| `GET` | `/api/v1/history` | List past generations | `profile:read` |
| `GET` | `/api/v1/history/{entry_id}` | Get one generation's full output | `profile:read` |

## Request/response notes

Reads devices, bandwidth caps, subnets, and tags through the service layer, applies subnet-based tag inheritance, and returns YAML directly in the response — nothing is written to disk server-side. Every generation is recorded in `yaml_history` (actor + timestamp), so config drift is attributable via history even though the file itself isn't persisted server-side. See [[Architecture/Diagrams/Data Flow|Data Flow]] for the full pipeline.

## Errors

`403` missing `deployment:execute`; `422` if inventory data fails generation-time validation.

## Dependencies

`core/services/generate_service.py`, `core/services/history_service.py`, `core/logic.py::convert_to_collector_configs`, `formats/yamldump.py`.

## See also

[[Features/Feature - YAML Config Generation|Feature - YAML Config Generation]] · [[Features/Feature - Audit Log & History|Feature - Audit Log & History]]
