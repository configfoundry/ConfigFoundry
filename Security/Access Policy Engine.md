# Access Policy Engine

Parent: [[Security/Security Overview|Security Overview]] · [[Security/Authorization & RBAC|Authorization & RBAC]]

A second, independent authorization layer that runs **before** authentication: `AccessPolicyMiddleware` evaluates configured IP allow/deny rules (`NetworkACL` records, `core/services/policy_engine.py`) against the resolved client IP. A request from a denied IP never reaches `/auth/login`, let alone a protected route.

## Evaluation

First-match-wins, ordered by `priority` (lower = evaluated first). If nothing matches: default permissive, **unless** at least one `allow` rule exists for that scope — presence of an allow rule signals "allowlist mode," and anything unmatched is denied. Both IPv4 and IPv6 supported via the standard library's `ipaddress` module (no extra dependency).

Rules can be global (`org_id` NULL, evaluated for every org) or org-scoped. Deny rules should generally sit at lower priority numbers than allow rules so an explicit deny can't be shadowed by a broad allow — see `core/services/policy_engine.py`'s own precedence documentation.

## Trusted proxy resolution

`TrustedProxyMiddleware` runs first, resolving the real client IP from `X-Forwarded-For` — but only trusts that header from CIDRs listed in `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES`. An unset or overly broad value here lets a client spoof its own IP and bypass the policy engine entirely — see [[Security/Security Overview#Vulnerabilities & recommendations|Security Overview § Vulnerabilities & recommendations]].

## Known limitation

> [!WARNING]
> Time-based access windows (maintenance windows / business-hours-only access) are scaffolded (`PolicyEngine.evaluate_time_window()`) but **always return "allowed"** — not enforced yet. Flagged explicitly rather than silently absent. Planned for v0.7.0 — see [[Roadmap Overview]].

## API

See [[API Documentation/API Keys & Policies Endpoints|API Keys & Policies Endpoints]] for `GET/POST/PATCH/DELETE /api/v1/policies/network-acls`.

## See also

[[Security/Authorization & RBAC|Authorization & RBAC]] · [[Features/Feature - IP Access Policies|Feature - IP Access Policies]] · [[Architecture/Diagrams/Request Flow|Request Flow]]
