# Tags & Lists Endpoints

Parent: [[API Documentation/API Overview|API Overview]] · [[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]]

Routers: `api/v1/tags.py`, `api/v1/lists.py`. Requires `inventory:read` / `inventory:write`.

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/tags` | List tag definitions | `inventory:read` |
| `GET` | `/api/v1/tags/{tag_id}/usage` | Count of records referencing a tag (shown before delete) | `inventory:read` |
| `POST` | `/api/v1/tags` | Create a tag definition | `inventory:write` |
| `DELETE` | `/api/v1/tags/{tag_id}` | Delete a tag definition (never deletes records that used it, only the reference) | `inventory:write` |
| `GET` | `/api/v1/lists` | List managed value lists | `inventory:read` |
| `GET` | `/api/v1/lists/{list_name}/usage` | Usage count for a list value | `inventory:read` |
| `POST` | `/api/v1/lists/{list_name}` | Add/update values in a managed list | `inventory:write` |

## Request/response notes

- Deleting a tag, tag value, or Collector Region that's still referenced warns with the affected record count before proceeding (`GET .../usage` powers this).
- A tag can be enabled for Devices, Bandwidth, and Subnets simultaneously, sharing one value list — see [[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]].

## Errors

`404` unknown tag/list; `409` deleting an in-use tag without confirmation flag (if the API enforces it — verify current route signature in `/docs`).

## Dependencies

`core/services/tag_service.py`, `core/services/list_service.py`.

## See also

[[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]]
