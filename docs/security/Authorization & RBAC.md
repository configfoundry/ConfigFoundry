# Authorization & RBAC

Parent: [Security Overview](Security Overview.md)

## Model

Entirely permission-code based — `<resource>:<action>` strings (e.g. `inventory:write`, `user:manage`), defined once in `core/security/permissions.py`. Route handlers never check a role name directly:

```python
@router.delete("/devices/{device_id}")
def delete_device(
    device_id: int,
    principal: Principal = Depends(require_permission("inventory:write")),
):
    ...
```

`require_permission(code)` resolves the caller's `Principal` (JWT or API key), loads the effective permission set (union of every assigned role's grants, or an API key's own scoped list), and raises `403` if the code isn't present.

Because handlers depend on a *code*, not a *role name*, what roles grant what is entirely data-driven — `PATCH /api/v1/roles/{id}/permissions` takes effect immediately for every route checking that code, with zero code changes.

## New users start with nothing

No implicit access "just because an account exists." A new user holds zero permissions until an admin explicitly assigns a role via `POST /api/v1/users/{id}/roles` — access review is always a positive, auditable action, not something to notice is *missing*.

## Immediate revocation without a token blacklist

Every user carries `perm_version`, embedded in every issued access token. Role changes, forced logout, password changes, and deactivation all bump it; `get_current_principal()` rejects any token whose embedded value is stale — takes effect on the *next request*, not whenever the 15-minute token naturally expires.

## Organization scoping

The entire security layer (`User`, `Role`, `ApiKey`, `NetworkACL`, `AuditLog`) is scoped to an `Organization`. Every permission check is implicitly scoped to the caller's own org — Super Admin is the one exception, holding every permission across every org by definition.

## Auditing every decision

Every permission-checked mutation and every security-relevant event is recorded via `AuditRepository.log(...)`, queryable via `GET /api/v1/audit` / `GET /api/v1/audit/search` (`audit:read`).

## See also

[RBAC Permission Catalog](RBAC Permission Catalog.md) · [Access Policy Engine](Access Policy Engine.md) · [Users & Roles Endpoints](../api/Users & Roles Endpoints.md)
