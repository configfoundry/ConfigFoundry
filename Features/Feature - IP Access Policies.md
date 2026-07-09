# Feature: IP Access Policies

Parent: [[Security/Access Policy Engine|Access Policy Engine]] · [[Repository Overview]]

## Purpose

Network-level allow/deny control (CIDR-based) evaluated before authentication — a second, independent authorization layer.

## Business value

Lets an operator restrict access to a specific network segment as a compliance requirement, not just a convenience — relevant to the regulated environments this project targets.

## Current implementation

See [[Security/Access Policy Engine|Access Policy Engine]] for the evaluation model (first-match-wins by priority, allowlist-mode semantics). Managed via `GET/POST/PATCH/DELETE /api/v1/policies/network-acls[/{id}]` (requires `policy:manage`).

## Files involved

- Backend: `api/v1/policies.py`, `core/services/policy_service.py`, `core/services/policy_engine.py`, `core/security/middleware.py::AccessPolicyMiddleware`, `core/security/ip.py`, `models/auth.py::NetworkACLModel`
- Frontend: `frontend/src/modules/administration/PoliciesView.tsx`

## User flow

Administration -> Policies -> add an allow/deny CIDR rule with a priority -> takes effect on the next request (evaluated per-request, not cached beyond normal query cost).

## Dependencies

[[Security/Access Policy Engine|Access Policy Engine]], `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` configuration (client IP resolution must be trustworthy for this to be meaningful — see [[Security/Secrets & Configuration|Secrets & Configuration]]).

## Known limitations

Time-based (business-hours) access windows are scaffolded but not enforced — see [[Security/Access Policy Engine#Known limitation|Access Policy Engine § Known limitation]].

## Future improvements

Time-based access policy enforcement — v0.7.0. See [[Roadmap Overview]].

## See also

[[Security/Access Policy Engine|Access Policy Engine]] · [[API Documentation/API Keys & Policies Endpoints|API Keys & Policies Endpoints]]
