# API Reference

ConfigFoundry exposes a REST API under `/api/v1/`. This page is a
navigable endpoint index with auth/error conventions; the authoritative,
always-up-to-date source is the interactive OpenAPI documentation
generated from the code itself:

- **Swagger UI** — `http://localhost:8420/docs` (try requests directly in the browser)
- **ReDoc** — `http://localhost:8420/redoc` (better for reading/printing)
- **Raw OpenAPI JSON** — `http://localhost:8420/openapi.json`

Both docs pages are fully self-hosted (no CDN, works air-gapped) and
register a `BearerAuth` security scheme, so every protected endpoint
shows a lock icon and Swagger's **Authorize** button accepts either a
JWT access token or an API key. See [Authentication](./authentication.md)
for how to obtain either, and [API Versioning](./api-versioning.md) for
how new versions get added alongside `v1` without breaking it.

## Conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt-access-token>` or `Authorization: Bearer cfk_live_...` (API key)
- All endpoints except `/auth/login`, `/auth/mfa/verify`, and `/auth/refresh` require authentication.
- Every protected endpoint additionally requires a specific permission code — see [RBAC](./rbac.md) for the full catalog and which system roles grant which codes.
- Request/response bodies are JSON (except file exports and Excel imports, which use standard multipart/binary).
- Errors use FastAPI's standard shape: `{"detail": "..."}` for simple errors, or a Pydantic validation error list for `422` responses.
- Every mutating action (create/update/delete on inventory or security objects) is recorded in the audit log — see `GET /api/v1/audit`.

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `204` | Success, no body (deletes) |
| `400` | Bad request (validation failure not caught by schema) |
| `401` | Missing, invalid, or expired credentials |
| `403` | Authenticated, but missing the required permission |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate name) |
| `422` | Request body failed schema validation |
| `429` | Rate limited (see `CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN`) |

## Endpoint index

### Auth (`auth.py`) — public except `/auth/me` and session management

```
POST   /api/v1/auth/login
POST   /api/v1/auth/mfa/verify
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/auth/me
POST   /api/v1/auth/password/change
POST   /api/v1/auth/mfa/enroll/begin
POST   /api/v1/auth/mfa/enroll/confirm
POST   /api/v1/auth/mfa/disable
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/{session_id}
```

### Users & roles (`users.py`, `roles.py`) — requires `user:*` / `role:*`

```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{user_id}
PATCH  /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}
POST   /api/v1/users/{user_id}/reactivate
POST   /api/v1/users/{user_id}/roles
DELETE /api/v1/users/{user_id}/roles/{role_id}
POST   /api/v1/users/{user_id}/reset-password

GET    /api/v1/roles
GET    /api/v1/permissions
POST   /api/v1/roles
GET    /api/v1/roles/{role_id}
PATCH  /api/v1/roles/{role_id}/permissions
DELETE /api/v1/roles/{role_id}
```

### API keys & network policies (`api_keys.py`, `policies.py`) — requires `api:manage` / `policy:manage`

```
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/{key_id}

GET    /api/v1/policies/network-acls
POST   /api/v1/policies/network-acls
PATCH  /api/v1/policies/network-acls/{rule_id}/enabled
DELETE /api/v1/policies/network-acls/{rule_id}
```

### Inventory — devices, bandwidth, subnets (requires `inventory:read` / `inventory:write`)

Each of the three follows the same pattern:

```
GET    /api/v1/devices
POST   /api/v1/devices/validate-import
POST   /api/v1/devices/import
POST   /api/v1/devices
DELETE /api/v1/devices/{device_id}

GET    /api/v1/bandwidth
POST   /api/v1/bandwidth/validate-import
POST   /api/v1/bandwidth/import
POST   /api/v1/bandwidth
DELETE /api/v1/bandwidth/{row_id}

GET    /api/v1/subnets
POST   /api/v1/subnets/validate-import
POST   /api/v1/subnets/import
POST   /api/v1/subnets
DELETE /api/v1/subnets/{row_id}
```

The `validate-import` / `import` pair lets a client dry-run an Excel
upload (get back per-row validation errors without writing anything),
then commit the same file once the user has reviewed the errors.

### Tags & managed lists (requires `inventory:read` / `inventory:write`)

```
GET    /api/v1/tags
GET    /api/v1/tags/{tag_id}/usage
POST   /api/v1/tags
DELETE /api/v1/tags/{tag_id}

GET    /api/v1/lists
GET    /api/v1/lists/{list_name}/usage
POST   /api/v1/lists/{list_name}
```

### Config generation & history (requires `deployment:execute` / `profile:read`)

```
POST   /api/v1/generate
GET    /api/v1/history
GET    /api/v1/history/{entry_id}
```

### Export (requires `export:read`)

```
GET    /api/v1/export/devices.xlsx
GET    /api/v1/export/bandwidth.xlsx
GET    /api/v1/export/subnets.xlsx
```

### Audit & metadata (requires `audit:read` / `meta:read`)

```
GET    /api/v1/audit
GET    /api/v1/audit/search
GET    /api/v1/meta
```

## Example: authenticate and call a protected endpoint

```bash
# 1. Log in
curl -sX POST http://localhost:8420/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@configfoundry.local", "password": "..."}'
# -> {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}

# 2. Use the access token
curl -s http://localhost:8420/api/v1/devices \
  -H 'Authorization: Bearer <access_token>'
```

Or with a long-lived API key (no login step, better for scripts/collectors):

```bash
curl -s http://localhost:8420/api/v1/devices \
  -H 'Authorization: Bearer cfk_live_...'
```

## Pagination, filtering, sorting

List endpoints (`/devices`, `/bandwidth`, `/subnets`, `/users`, `/audit`,
etc.) accept standard query parameters — check each endpoint's schema in
`/docs` for its exact filter fields, since they're resource-specific
(e.g. devices filter by tag/subnet, audit filters by actor/date-range/
resource-type). Where an endpoint supports pagination it uses
`limit`/`offset` query parameters and returns a `total` count alongside
the page of results.

## Versioning

See [API Versioning](./api-versioning.md) for the full design rationale.
In short: the version lives in the URL (`/api/v1/...`), old versions are
never removed or changed once released, and `/docs` shows every version
that's currently mounted.
