# Competitive Advantages

Parent: [Product Vision](Product Vision.md)

Assessed from the actual codebase and documentation, not a marketing brief — every claim below is traceable to a specific implementation.

## Versus a shared spreadsheet

Multi-user concurrent access to one dataset (no per-person copies to reconcile), input validation client- and server-side, a full audit trail of every change, and generated YAML that's always derived from current data rather than hand-copied. See [Repository Overview](../../reference/Repository Overview.md#business-problem-solved).

## Versus a typical self-hosted internal tool

- **Air-gap deployment is verified, not assumed.** CI actually firewalls a runner off from PyPI/npm/GitHub before proving an offline install works — most internal tools silently assume registry/CDN reachability. See [Air-Gap Deployment](../../deployment/Air-Gap Deployment.md).
- **Security is architecture, not a bolt-on.** Permission-code RBAC (never a hardcoded role-name check), immediate token revocation without a blacklist (`perm_version`), refresh-token reuse detection, an independent IP-based Access Policy Engine that runs before authentication. See [Security Overview](../../security/Security Overview.md).
- **A documented SOC 2 control mapping exists** at the codebase level — most tools at this scale have no compliance mapping at all. See [SOC 2 Compliance Mapping](../../security/SOC 2 Compliance Mapping.md).
- **Storage is genuinely swappable**, not a leaky abstraction — no repository or service imports a database driver directly. See [Storage Abstraction](../../architecture/Storage Abstraction.md).

## Versus a heavyweight CMDB

Deliberately narrower scope (only what's needed to generate monitoring config) means a much smaller surface area to learn, audit, and secure — explicitly not competing on asset-lifecycle/ownership tracking. See [Product Vision § Non-goals](Product Vision.md#non-goals-deliberate).

## Honest counterpoints (for a fair comparison)

- Single-tenant inventory today (multi-tenant security layer, not yet multi-tenant inventory) — see [Database Overview](../../architecture/Database Overview.md#future-schema-improvements).
- No SSO/OIDC/LDAP yet — a real gap versus enterprise IdP-integrated tools, planned v0.7.0.
- No horizontal scaling story validated for the default SQLite backend.
- Pre-1.0 — the project is honest about this in its own README ("Enterprise Preview," not "production-ready").

## See also

[Target Users & Use Cases](Target Users & Use Cases.md) · [OSS vs Enterprise](OSS vs Enterprise.md) · [Executive Summary](Executive Summary.md)
