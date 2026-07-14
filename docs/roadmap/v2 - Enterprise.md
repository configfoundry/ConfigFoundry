# v2 — Enterprise Capabilities

Parent: [Roadmap Overview](Roadmap Overview.md)

> [!NOTE]
> Some items below already exist in some form today — this bucket is about *deepening* them, not building from zero.

## v0.7.0 — Enterprise capabilities

- **SQL Server** — a real, production-validated implementation, not just the scaffolded interface (see [Database Overview](../architecture/Database Overview.md)).
- **Audit logs** — already shipped; this bucket covers retention policies and export tooling.
- **Teams** — a collaboration/grouping layer above individual roles, distinct from the existing organization-scoped RBAC.
- **API keys** — already shipped; this bucket covers richer scoping and management UI.
- **External IdP / OIDC / SSO** — the token/claims model is already compatible (an external identity would map onto the existing `User` + `perm_version` + RBAC machinery), but no client code exists yet.
- **LDAP** — directory-based authentication as an alternative to local password auth.
- **Time-based access policies** — enforcing the maintenance-window/business-hours scaffolding that currently always evaluates as allowed. See [Access Policy Engine § Known limitation](../security/Access Policy Engine.md#known-limitation).
- **Multi-tenant inventory scoping** — retrofitting `org_id` onto the original inventory tables, today implicitly single-tenant even though the security layer around them is fully organization-scoped. The largest single migration on this list. See [Database Overview](../architecture/Database Overview.md#future-schema-improvements).

## v0.8.x — Scalability

- **High availability** — a documented, tested multi-instance topology behind a shared PostgreSQL database, plus a Redis-backed rate limiter so multi-instance deployments share one limit instead of independent per-process ones.
- **A reviewed plugin interface** — a defined extension point for in-repo, reviewed integrations. **Not** dynamic third-party code loading or a plugin marketplace — see [Future Ideas § Deliberately out of scope](Future Ideas.md).
- **Performance** — profiling and addressing real bottlenecks at larger inventory sizes, once there's production usage data to profile against.

## See also

[Roadmap Overview](Roadmap Overview.md) · [v1](v1.md) · [OSS vs Enterprise](../internal/product/OSS vs Enterprise.md)
