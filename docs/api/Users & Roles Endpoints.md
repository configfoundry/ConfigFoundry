# Users & Roles Endpoints

Parent: [API Overview](API Overview.md) · [RBAC Permission Catalog](../security/RBAC Permission Catalog.md)

Routers: `api/v1/users.py`, `api/v1/roles.py`. Requires `user:*` / `role:*` permission codes.

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/users` | List users | `user:read` |
| `POST` | `/api/v1/users` | Create user | `user:manage` |
| `GET` | `/api/v1/users/{user_id}` | Get one user | `user:read` |
| `PATCH` | `/api/v1/users/{user_id}` | Update user | `user:manage` |
| `DELETE` | `/api/v1/users/{user_id}` | Deactivate user | `user:manage` |
| `POST` | `/api/v1/users/{user_id}/reactivate` | Reactivate a deactivated user | `user:manage` |
| `POST` | `/api/v1/users/{user_id}/roles` | Assign a role | `user:manage` |
| `DELETE` | `/api/v1/users/{user_id}/roles/{role_id}` | Remove a role | `user:manage` |
| `POST` | `/api/v1/users/{user_id}/reset-password` | Admin-issued password reset | `user:manage` |
| `GET` | `/api/v1/roles` | List roles | `role:read` |
| `GET` | `/api/v1/permissions` | List the full permission catalog | `role:read` |
| `POST` | `/api/v1/roles` | Create a custom role | `role:manage` |
| `GET` | `/api/v1/roles/{role_id}` | Get one role | `role:read` |
| `PATCH` | `/api/v1/roles/{role_id}/permissions` | Change a role's permission grants | `role:manage` |
| `DELETE` | `/api/v1/roles/{role_id}` | Delete a custom role (system roles cannot be deleted) | `role:manage` |

## Errors

`404` unknown user/role ID; `409` duplicate role name; `403` missing permission or attempting to edit the Super Admin role (not editable — holding everything is definitional).

## Example — create a custom role

```bash
curl -sX POST http://localhost:8420/api/v1/roles \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "name": "Bandwidth Reviewer",
    "description": "Read inventory, review generated configs, no write access",
    "permissions": ["inventory:read", "profile:read", "meta:read"]
  }'
```

## Dependencies

`core/services/user_service.py`, `core/services/role_service.py`, `core/services/rbac_service.py`. Effect of a role change is **immediate** via `perm_version` invalidation — see [Authorization & RBAC](../security/Authorization & RBAC.md).

## See also

[RBAC Permission Catalog](../security/RBAC Permission Catalog.md) · [Feature - RBAC & Access Management](../reference/features/Feature - RBAC & Access Management.md)
