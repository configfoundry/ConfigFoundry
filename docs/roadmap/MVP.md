# MVP

Parent: [Roadmap Overview](Roadmap Overview.md)

Unlike a pre-launch product, ConfigFoundry's MVP is **already shipped** — v0.5.0 constitutes a functioning minimum viable product per the project's own "Enterprise Preview" framing. This page documents what that MVP consists of, for planning-reference purposes.

## MVP scope (shipped in v0.5.0)

- Full inventory CRUD (devices, bandwidth caps, subnets) with search/sort/pagination/Excel import-export — [Feature - Inventory Management](../reference/features/Feature - Inventory Management.md)
- Dynamic tagging with subnet inheritance — [Feature - Dynamic Tags](../reference/features/Feature - Dynamic Tags.md)
- YAML config generation with history — [Feature - YAML Config Generation](../reference/features/Feature - YAML Config Generation.md)
- Enterprise authentication (Argon2id, JWT, MFA, API keys) — [Authentication](../security/Authentication Overview.md)
- Permission-code RBAC with 5 system roles + custom roles — [Authorization & RBAC](../security/Authorization & RBAC.md)
- IP-based Access Policy Engine — [Access Policy Engine](../security/Access Policy Engine.md)
- Full audit trail — [Feature - Audit Log & History](../reference/features/Feature - Audit Log & History.md)
- SQLite storage, zero-config — [Database Overview](../architecture/Database Overview.md)
- Verified air-gap deployment — [Air-Gap Deployment](../deployment/Air-Gap Deployment.md)
- In-app documentation portal — [Feature - Documentation Portal](../reference/features/Feature - Documentation Portal.md)

## Explicitly not in MVP scope

The Network Tree in the current frontend ([Feature - Network Tree](../reference/features/Feature - Network Tree.md)), SSO/OIDC/LDAP, multi-tenant inventory isolation, production-validated non-SQLite storage, `/health`/`/metrics` endpoints. All tracked in [Next Sprint](Next Sprint.md) or [v2 - Enterprise](v2 - Enterprise.md).

## See also

[Roadmap Overview](Roadmap Overview.md) · [Changelog](../../CHANGELOG.md)
