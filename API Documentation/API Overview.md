# API Overview

Parent: [[Repository Overview]] · [[Architecture Overview]]

ConfigFoundry exposes a REST API under `/api/v1/`. The authoritative, always-current source is the interactive OpenAPI documentation generated from the code itself — Swagger UI at `/docs`, ReDoc at `/redoc`, raw spec at `/openapi.json` (all self-hosted, no CDN — see [[Deployment/Air-Gap Deployment|Air-Gap Deployment]]). This page and its children are a navigable index.

## Conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt-access-token>` or `Authorization: Bearer cfk_live_...` (API key) — see [[Security/Authentication|Authentication]]
- All endpoints except `/auth/login`, `/auth/mfa/verify`, and `/auth/refresh` require authentication
- Every protected endpoint additionally requires a specific permission code — see [[Security/RBAC Permission Catalog|RBAC Permission Catalog]]
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
| Auth | [[API Documentation/Auth Endpoints\|Auth Endpoints]] | `api/v1/auth.py` |
| Users & Roles | [[API Documentation/Users & Roles Endpoints\|Users & Roles Endpoints]] | `api/v1/users.py`, `api/v1/roles.py` |
| API Keys & Policies | [[API Documentation/API Keys & Policies Endpoints\|API Keys & Policies Endpoints]] | `api/v1/api_keys.py`, `api/v1/policies.py` |
| Inventory (devices/bandwidth/subnets) | [[API Documentation/Inventory Endpoints\|Inventory Endpoints]] | `api/v1/devices.py`, `api/v1/bandwidth.py`, `api/v1/subnets.py` |
| Tags & Lists | [[API Documentation/Tags & Lists Endpoints\|Tags & Lists Endpoints]] | `api/v1/tags.py`, `api/v1/lists.py` |
| Generate & History | [[API Documentation/Generate & History Endpoints\|Generate & History Endpoints]] | `api/v1/generate.py`, `api/v1/history.py` |
| Export | [[API Documentation/Export & Audit Endpoints\|Export & Audit Endpoints]] | `api/v1/export.py` |
| Audit & Meta | [[API Documentation/Export & Audit Endpoints\|Export & Audit Endpoints]] | `api/v1/audit.py`, `api/v1/meta.py` |

See also [[API Documentation/API Versioning|API Versioning]] for how `/api/v2/` would be added, and [[Architecture Overview#Request lifecycle]] for what happens before a route handler runs.

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

[[Security/Authentication|Authentication]] · [[Security/RBAC Permission Catalog|RBAC Permission Catalog]] · [[Backend/Backend Overview|Backend Overview]]
