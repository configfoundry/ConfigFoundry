# Inventory Endpoints (Devices, Bandwidth, Subnets)

Parent: [API Overview](API Overview.md) · [Feature - Inventory Management](../reference/features/Feature - Inventory Management.md)

Routers: `api/v1/devices.py`, `api/v1/bandwidth.py`, `api/v1/subnets.py`. Requires `inventory:read` / `inventory:write`. All three follow the identical pattern:

| Method | Path (devices shown; same shape for `bandwidth`, `subnets`) | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/devices` | List/search/paginate | `inventory:read` |
| `POST` | `/api/v1/devices/validate-import` | Dry-run an Excel upload — per-row errors, no writes | `inventory:write` |
| `POST` | `/api/v1/devices/import` | Commit a validated import (merge or replace mode) | `inventory:write` |
| `POST` | `/api/v1/devices` | Create/update a record | `inventory:write` |
| `DELETE` | `/api/v1/devices/{device_id}` | Delete a record | `inventory:write` |

Equivalent paths: `/api/v1/bandwidth[...]`, `/api/v1/subnets[...]`.

## Request/response notes

- List endpoints accept resource-specific filters (devices filter by tag/subnet, etc.) — check `/docs` for the exact schema per endpoint.
- IP/CIDR fields are validated both client-side (instant feedback) and server-side (`core/validator.py`) — a bad value can't enter through the API directly even if the UI is bypassed.
- Import: rows with an invalid IP/CIDR are **skipped with a count**, not silently corrupted or rejected wholesale.
- Excel column headers are alias-tolerant for credential fields (`Auth Key`, `authKey`, `AuthKey` all map to the same field).

## Errors

`404` unknown ID; `409` duplicate key conflicts; `422` schema validation; import endpoints return per-row errors in the response body rather than a single top-level error.

## Dependencies

`core/services/device_service.py`, `core/services/bandwidth_service.py`, `core/services/subnet_service.py`, `core/services/import_service.py`, `core/validator.py`, `formats/xlsxwriter.py` (export path).

## See also

[Feature - Inventory Management](../reference/features/Feature - Inventory Management.md) · [Feature - Excel Import Export](../reference/features/Feature - Excel Import Export.md) · [Database Overview](../architecture/Database Overview.md)
