# API Overview

Parent: [Repository Overview](../reference/Repository Overview.md) · [Architecture Overview](../architecture/Architecture Overview.md)

ConfigFoundry exposes a REST API under `/api/v1/`. The authoritative, always-current source is the interactive OpenAPI documentation generated from the code itself — Swagger UI at `/docs`, ReDoc at `/redoc`, raw spec at `/openapi.json` (all self-hosted, no CDN — see [Air-Gap Deployment](../deployment/Air-Gap Deployment.md)). This page and its children are a navigable index.

## Conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt-access-token>` or `Authorization: Bearer cfk_live_...` (API key) — see [Authentication](../security/Authentication Overview.md)
- All endpoints except `/auth/login`, `/auth/mfa/verify`, and `/auth/refresh` require authentication
- Every protected endpoint additionally requires a specific permission code — see [RBAC Permission Catalog](../security/RBAC Permission Catalog.md)
- Bodies are JSON, except file exports/Excel imports (multipart/binary)
- Errors: `{"detail": "..."}` for simple errors, a Pydantic validation list for `422`
- Every mutating action on inventory or security objects is recorded in the audit log (`GET /api/v1/audit`)

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `204` | Success, no body (deletes) |
| `400` | Bad request |
| `401` | Missing/invalid/expired credentials |
| `403` | Authenticated, missing permission |
| `404` | Not found |
| `409` | Conflict (e.g. duplicate name) |
| `422` | Schema validation failure |
| `429` | Rate limited |

## Endpoint groups

| Group | Page | Router file |
|---|---|---|
| Auth | [Auth Endpoints](Auth Endpoints.md) | `api/v1/auth.py` |
| Users & Roles | [Users & Roles Endpoints](Users & Roles Endpoints.md) | `api/v1/users.py`, `api/v1/roles.py` |
| API Keys & Policies | [API Keys & Policies Endpoints](API Keys & Policies Endpoints.md) | `api/v1/api_keys.py`, `api/v1/policies.py` |
| Inventory (devices/bandwidth/subnets) | [Inventory Endpoints](Inventory Endpoints.md) | `api/v1/devices.py`, `api/v1/bandwidth.py`, `api/v1/subnets.py` |
| Tags & Lists | [Tags & Lists Endpoints](Tags & Lists Endpoints.md) | `api/v1/tags.py`, `api/v1/lists.py` |
| Generate & History | [Generate & History Endpoints](Generate & History Endpoints.md) | `api/v1/generate.py`, `api/v1/history.py` |
| Export | [Export & Audit Endpoints](Export & Audit Endpoints.md) | `api/v1/export.py` |
| Audit & Meta | [Export & Audit Endpoints](Export & Audit Endpoints.md) | `api/v1/audit.py`, `api/v1/meta.py` |

See also [API Versioning](API Versioning.md) for how `/api/v2/` would be added, and [Architecture Overview](../architecture/Architecture Overview.md#request-lifecycle) for what happens before a route handler runs.

## Example

```bash
curl -sX POST http://localhost:8420/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@configfoundry.local", "password": "..."}'
# -> {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}

curl -s http://localhost:8420/api/v1/devices \
  -H 'Authorization: Bearer <access_token>'
```

## See also

[Authentication](../security/Authentication Overview.md) · [RBAC Permission Catalog](../security/RBAC Permission Catalog.md) · [Backend Overview](../architecture/Backend Overview.md)
