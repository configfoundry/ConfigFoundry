# Feature: RBAC & Access Management

Parent: [[Security/Authorization & RBAC|Authorization & RBAC]] · [[Repository Overview]]

## Purpose

Admin UI and API for managing users, roles, and permission grants.

## Business value

Lets an organization enforce least-privilege access without code changes — roles and grants are entirely data-driven. See [[Security/RBAC Permission Catalog|RBAC Permission Catalog]].

## Current implementation

Full CRUD for users (create, edit, deactivate/reactivate, assign roles, admin-reset password) and roles (create custom roles, edit permission grants on any non-system role). See [[API Documentation/Users & Roles Endpoints|Users & Roles Endpoints]].

## Files involved

- Backend: `api/v1/users.py`, `api/v1/roles.py`, `core/services/{user_service,role_service,rbac_service}.py`
- Frontend: `frontend/src/modules/administration/{UsersView,RolesView,AdminTabs}.tsx`, `frontend/src/components/common/PermissionTree.tsx`

## User flow

Administration -> Users -> create/edit/deactivate, assign roles; Administration -> Roles -> create a custom role, check/uncheck permissions in the `PermissionTree` component -> `PATCH /api/v1/roles/{id}/permissions`.

## Dependencies

[[Security/RBAC Permission Catalog|RBAC Permission Catalog]], [[Features/Feature - Audit Log & History|Feature - Audit Log & History]] (every grant change is audited).

## Known limitations

The **Organizations admin page** has no REST endpoint (`organization_service.py` exists but has no router) — confirmed skipped, not built, per `frontend/VUEXY_MIGRATION_REPORT.md`. `@mui/x-tree-view` v6.17's older API is used in `PermissionTree.tsx` — an upgrade will require touching this component.

## Future improvements

An Organizations management UI/endpoint once multi-tenant inventory scoping lands (v0.7.0) — see [[Roadmap Overview]].

## See also

[[Security/RBAC Permission Catalog|RBAC Permission Catalog]] · [[API Documentation/Users & Roles Endpoints|Users & Roles Endpoints]]
