# Competitive Advantages

Parent: [[Product/Product Vision|Product Vision]]

Assessed from the actual codebase and documentation, not a marketing brief — every claim below is traceable to a specific implementation.

## Versus a shared spreadsheet

Multi-user concurrent access to one dataset (no per-person copies to reconcile), input validation client- and server-side, a full audit trail of every change, and generated YAML that's always derived from current data rather than hand-copied. See [[Repository Overview#Business problem solved]].

## Versus a typical self-hosted internal tool

- **Air-gap deployment is verified, not assumed.** CI actually firewalls a runner off from PyPI/npm/GitHub before proving an offline install works — most internal tools silently assume registry/CDN reachability. See [[Deployment/Air-Gap Deployment|Air-Gap Deployment]].
- **Security is architecture, not a bolt-on.** Permission-code RBAC (never a hardcoded role-name check), immediate token revocation without a blacklist (`perm_version`), refresh-token reuse detection, an independent IP-based Access Policy Engine that runs before authentication. See [[Security/Security Overview|Security Overview]].
- **A documented SOC 2 control mapping exists** at the codebase level — most tools at this scale have no compliance mapping at all. See [[Security/SOC 2 Compliance Mapping|SOC 2 Compliance Mapping]].
- **Storage is genuinely swappable**, not a leaky abstraction — no repository or service imports a database driver directly. See [[Backend/Storage Abstraction|Storage Abstraction]].

## Versus a heavyweight CMDB

Deliberately narrower scope (only what's needed to generate monitoring config) means a much smaller surface area to learn, audit, and secure — explicitly not competing on asset-lifecycle/ownership tracking. See [[Product/Product Vision#Non-goals (deliberate)|Product Vision § Non-goals]].

## Honest counterpoints (for a fair comparison)

- Single-tenant inventory today (multi-tenant security layer, not yet multi-tenant inventory) — see [[Database Overview#Future schema improvements]].
- No SSO/OIDC/LDAP yet — a real gap versus enterprise IdP-integrated tools, planned v0.7.0.
- No horizontal scaling story validated for the default SQLite backend.
- Pre-1.0 — the project is honest about this in its own README ("Enterprise Preview," not "production-ready").

## See also

[[Product/Target Users & Use Cases|Target Users & Use Cases]] · [[Product/OSS vs Enterprise|OSS vs Enterprise]] · [[Executive Summary]]
