# Role-Based Access Control (RBAC)

The full permission catalog and system role definitions, as seeded by
the auth migration (`alembic/versions/0002_auth_and_security.py`) and
kept self-consistent by `core/security/permissions.py::ensure_seeded()`
(runs at every `ServiceContainer` startup, so a newly added permission
code in a future release self-heals into the database without a manual
migration step).

For how these are enforced at the route level, see
[Authorization](./authorization.md). For how a user gets a role
assigned, see the `/users/{id}/roles` endpoints in [API Reference](./api.md).

## Permission catalog

| Code | Category | Grants |
|---|---|---|
| `inventory:read` | Inventory | View devices, bandwidth caps, subnets, tags, and lists |
| `inventory:write` | Inventory | Create, edit, delete, and import inventory records |
| `profile:read` | Deployment | View generated YAML config output and history |
| `profile:write` | Deployment | Modify config-generation inputs |
| `deployment:execute` | Deployment | Run YAML config generation |
| `export:read` | Deployment | Export inventory data to Excel |
| `settings:modify` | System | Change application-wide settings |
| `meta:read` | System | View inventory metadata and statistics |
| `user:read` | Access Management | View user accounts |
| `user:manage` | Access Management | Create, edit, deactivate, and assign roles to users |
| `role:read` | Access Management | View roles and their permissions |
| `role:manage` | Access Management | Create, edit, and delete roles; change permission grants |
| `api:manage` | Access Management | Create, rotate, and revoke API keys |
| `policy:manage` | Access Management | Manage IP allow/deny lists and access policies |
| `organization:manage` | Access Management | Manage organization settings (multi-tenant) |
| `audit:read` | Audit | View the audit log (business + security events) |

## System roles

Five roles are seeded automatically. All except Super Admin can be
freely edited — reassign their permissions, or create entirely new
custom roles — through `POST /api/v1/roles` and
`PATCH /api/v1/roles/{id}/permissions` (requires `role:manage`).

| Role | Intended for | Permissions |
|---|---|---|
| **Super Admin** | Platform operators | Every permission, always in sync with the catalog. Not org-scoped — spans every organization. Not editable through the UI (holding everything is definitional). |
| **Organization Admin** | Team/department leads | Full access within one organization: `inventory:*`, `profile:*`, `deployment:execute`, `export:read`, `settings:modify`, `meta:read`, `user:*`, `role:*`, `api:manage`, `policy:manage`, `audit:read` |
| **Operator** | Day-to-day inventory work | `inventory:read`, `inventory:write`, `profile:read`, `profile:write`, `deployment:execute`, `export:read`, `meta:read` — no user/role/policy management |
| **Read Only** | Stakeholders who need visibility, not edit access | `inventory:read`, `profile:read`, `export:read`, `meta:read` |
| **Auditor** | Compliance/security review | `inventory:read`, `profile:read`, `meta:read`, `audit:read` — read-only plus the audit trail, deliberately without operational access |

## Custom roles

Any combination of the permission codes above can be assembled into a
custom role via `POST /api/v1/roles`:

```bash
curl -sX POST http://localhost:8420/api/v1/roles \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "name": "Bandwidth Reviewer",
    "description": "Read inventory, review generated configs, no write access",
    "permissions": ["inventory:read", "profile:read", "meta:read"]
  }'
```

A user can hold multiple roles simultaneously — their effective
permission set is the union of every assigned role's grants.

## Design rationale

Permission codes rather than role-name checks means the *set of
permissions* is the stable contract routes depend on, while *which
roles grant which permissions* stays fully data-driven and editable
without a code change or redeploy. Adding a new permission is:

1. Add an entry to `PERMISSION_CATALOG` in `core/security/permissions.py`.
2. `ensure_seeded()` picks it up automatically on next startup.
3. Reference it from a route with `require_permission("new:code")`.
4. Optionally add it to `SYSTEM_ROLES` defaults, or leave it for admins
   to grant to custom roles as needed.

See [Authorization](./authorization.md) for the enforcement pipeline and
[Authentication](./authentication.md) for how a caller's identity is
established before any of this runs.
