# Authorization

This page covers how ConfigFoundry decides whether an authenticated
caller is allowed to do something. For how a caller becomes
authenticated in the first place, see [Authentication](./authentication.md).
For the full permission catalog and system role definitions, see
[RBAC](./rbac.md).

## Model

Authorization is entirely permission-code based —
`<resource>:<action>` strings such as `inventory:write` or
`user:manage`, defined once in `core/security/permissions.py`. Route
handlers never check a role name directly:

```python
@router.delete("/devices/{device_id}")
def delete_device(
    device_id: int,
    principal: Principal = Depends(require_permission("inventory:write")),
):
    ...
```

`require_permission(code)` is a FastAPI dependency that:

1. Resolves the caller's `Principal` via `get_current_principal()` (JWT
   or API key — see Authentication).
2. Loads the principal's effective permission set (union of all
   permissions granted by all roles assigned to the user, or the
   explicit permission list attached to an API key if scoped).
3. Returns the `Principal` if the code is present; raises `403` if not.

Because handlers depend on a *code*, not a *role name*, what roles grant
what permissions is entirely data-driven — changing a role's grants
through the admin UI (`PATCH /api/v1/roles/{id}/permissions`) takes
effect immediately for every route that checks that code, with zero
code changes.

## Newly created users start with nothing

There is no implicit access "just because an account exists." A new
user holds zero permissions until an admin explicitly assigns a role via
`POST /api/v1/users/{id}/roles`. This is deliberate: it means access
review is always a positive, auditable action rather than something to
notice is *missing*.

## Immediate revocation without a token blacklist

Every user row carries a `perm_version` integer, embedded in every
access token issued to that user. Role changes, forced logout, password
changes, and account deactivation all increment it.
`get_current_principal()` rejects any token whose embedded
`perm_version` doesn't match the current database value — so revoking a
role, or deactivating an account, takes effect on the very next request,
not "whenever the 15-minute access token happens to expire." This avoids
needing a persistent, ever-growing token blacklist while still getting
immediate revocation.

## Organization scoping

The entire security layer (`User`, `Role`, `ApiKey`, `NetworkACL`,
`AuditLog`) is scoped to an `Organization` and ready for multiple
tenants. Every permission check is implicitly scoped to the caller's own
organization — a Super Admin is the one exception, holding every
permission across every organization by definition.

See [Authentication § Known scope boundaries](./authentication.md#known-scope-boundaries)
for what is and isn't retrofitted with org-scoping on the pre-existing
inventory tables.

## The Access Policy Engine (IP-based authorization)

A second, independent authorization layer runs *before* authentication:
`AccessPolicyMiddleware` evaluates configured IP allow/deny rules
(`NetworkACL` records, managed via `/api/v1/policies/network-acls`)
against the resolved client IP. This catches disallowed traffic earlier
in the pipeline than permission checks — a request from a denied IP
never reaches the login endpoint, let alone a protected route.

Rules are evaluated first-match-wins, ordered by `priority` (lower
evaluated first). If nothing matches: default is permissive, *unless*
at least one `allow` rule exists for that scope, in which case the
presence of an allow rule signals "allowlist mode" and anything
unmatched is denied. Both IPv4 and IPv6 are supported using the standard
library's `ipaddress` module — no extra dependency.

**Known limitation, stated plainly:** time-based access windows
(maintenance windows / business-hours-only access) are scaffolded
(`PolicyEngine.evaluate_time_window()`) but always return "allowed" —
not yet enforced. Flagged here rather than silently missing.

## Auditing every decision

Every permission-checked mutation and every security-relevant event
(login, MFA enrollment, role change, API key creation, policy change) is
recorded through `AuditRepository.log(...)`, queryable via
`GET /api/v1/audit` and `GET /api/v1/audit/search` (requires
`audit:read`, the one permission granted to the built-in Auditor role
alongside read-only access — see [RBAC](./rbac.md)).
