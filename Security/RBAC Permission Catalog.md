# RBAC Permission Catalog

Parent: [[Security/Authorization & RBAC|Authorization & RBAC]]

Seeded by `alembic/versions/0002_auth_and_security.py`, kept self-consistent by `core/security/permissions.py::ensure_seeded()` (runs at every `ServiceContainer` startup, so a newly added permission code self-heals into the database without a manual migration).

## Permission catalog

| Code | Category | Grants |
|---|---|---|
| `inventory:read` | Inventory | View devices, bandwidth caps, subnets, tags, lists |
| `inventory:write` | Inventory | Create, edit, delete, import inventory records |
| `profile:read` | Deployment | View generated YAML output and history |
| `profile:write` | Deployment | Modify config-generation inputs |
| `deployment:execute` | Deployment | Run YAML config generation |
| `export:read` | Deployment | Export inventory data to Excel |
| `settings:modify` | System | Change application-wide settings |
| `meta:read` | System | View inventory metadata/statistics |
| `user:read` | Access Management | View user accounts |
| `user:manage` | Access Management | Create, edit, deactivate, assign roles |
| `role:read` | Access Management | View roles and permissions |
| `role:manage` | Access Management | Create/edit/delete roles, change grants |
| `api:manage` | Access Management | Create/rotate/revoke API keys |
| `policy:manage` | Access Management | Manage IP allow/deny rules |
| `organization:manage` | Access Management | Manage org settings (multi-tenant) |
| `audit:read` | Audit | View the audit log |

## System roles

| Role | Intended for | Permissions |
|---|---|---|
| **Super Admin** | Platform operators | Everything, always in sync with the catalog. Not org-scoped. Not editable through the UI. |
| **Organization Admin** | Team/department leads | `inventory:*`, `profile:*`, `deployment:execute`, `export:read`, `settings:modify`, `meta:read`, `user:*`, `role:*`, `api:manage`, `policy:manage`, `audit:read` |
| **Operator** | Day-to-day inventory work | `inventory:read`, `inventory:write`, `profile:read`, `profile:write`, `deployment:execute`, `export:read`, `meta:read` |
| **Read Only** | Visibility without edit access | `inventory:read`, `profile:read`, `export:read`, `meta:read` |
| **Auditor** | Compliance/security review | `inventory:read`, `profile:read`, `meta:read`, `audit:read` |

All roles except Super Admin are freely editable (`POST /api/v1/roles`, `PATCH /api/v1/roles/{id}/permissions`, requires `role:manage`). A user can hold multiple roles; their effective set is the union.

## Adding a new permission

1. Add an entry to `PERMISSION_CATALOG` in `core/security/permissions.py`.
2. `ensure_seeded()` picks it up automatically on next startup.
3. Reference it with `require_permission("new:code")` on a route.
4. Optionally add it to `SYSTEM_ROLES` defaults, or leave it for admins to grant via custom roles.

## See also

[[Security/Authorization & RBAC|Authorization & RBAC]] · [[API Documentation/Users & Roles Endpoints|Users & Roles Endpoints]] · [[Features/Feature - RBAC & Access Management|Feature - RBAC & Access Management]]
