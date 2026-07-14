# ADR-0002: Permission-Code RBAC Instead of Hardcoded Role Checks

Parent: [ADR Index](ADR Index.md) · [Authorization & RBAC](../security/Authorization & RBAC.md)

## Context

Access control needs to be both fine-grained (many distinct capabilities: `inventory:write`, `user:manage`, `audit:read`, ...) and changeable without a code deploy — an organization should be able to create a custom role ("Bandwidth Reviewer: read inventory, review configs, no writes") without engineering involvement, and a role's grants should be reviewable and auditable.

## Decision

Every protected route depends on `require_permission("<resource>:<action>")` — never a role name. `core/security/permissions.py` defines the flat `PERMISSION_CATALOG`; `SYSTEM_ROLES` defines default grant bundles for five seeded roles (Super Admin, Organization Admin, Operator, Read Only, Auditor); which roles grant which permissions is entirely data-driven, stored in `role_permissions` and editable via `PATCH /api/v1/roles/{id}/permissions`.

## Consequences

**Positive:** what roles grant what permissions changes with zero code changes or redeploy; adding a new permission is three steps (catalog entry, `ensure_seeded()` self-heals it into the DB, reference it from a route); custom roles are a first-class, self-service capability; new users start with zero permissions, making access grants a positive, auditable action rather than an implicit default.

**Negative:** requires discipline in code review to catch any future contributor reaching for a role-name check as a shortcut (the RBAC system offers no compiler-enforced guarantee against this — it's a convention, not a language feature); the permission catalog can grow large enough to need its own documentation page to stay legible (addressed by [RBAC Permission Catalog](../security/RBAC Permission Catalog.md)).

## Alternatives considered

A simpler role-name-based check (`if user.role == "admin"`) was implicitly rejected — it doesn't support custom roles without a code change, and mixes "who a user is" with "what a user can do," which is exactly what a compliance auditor asks to see separated (see [SOC 2 Compliance Mapping](../security/SOC 2 Compliance Mapping.md), CC6.3).

## See also

[RBAC Permission Catalog](../security/RBAC Permission Catalog.md) · [Authorization & RBAC](../security/Authorization & RBAC.md)
