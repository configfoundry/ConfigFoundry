# MVP

Parent: [[Roadmap Overview]]

Unlike a pre-launch product, ConfigFoundry's MVP is **already shipped** — v0.5.0 constitutes a functioning minimum viable product per the project's own "Enterprise Preview" framing. This page documents what that MVP consists of, for planning-reference purposes.

## MVP scope (shipped in v0.5.0)

- Full inventory CRUD (devices, bandwidth caps, subnets) with search/sort/pagination/Excel import-export — [[Features/Feature - Inventory Management|Feature - Inventory Management]]
- Dynamic tagging with subnet inheritance — [[Features/Feature - Dynamic Tags|Feature - Dynamic Tags]]
- YAML config generation with history — [[Features/Feature - YAML Config Generation|Feature - YAML Config Generation]]
- Enterprise authentication (Argon2id, JWT, MFA, API keys) — [[Security/Authentication|Authentication]]
- Permission-code RBAC with 5 system roles + custom roles — [[Security/Authorization & RBAC|Authorization & RBAC]]
- IP-based Access Policy Engine — [[Security/Access Policy Engine|Access Policy Engine]]
- Full audit trail — [[Features/Feature - Audit Log & History|Feature - Audit Log & History]]
- SQLite storage, zero-config — [[Database Overview]]
- Verified air-gap deployment — [[Deployment/Air-Gap Deployment|Air-Gap Deployment]]
- In-app documentation portal — [[Features/Feature - Documentation Portal|Feature - Documentation Portal]]

## Explicitly not in MVP scope

The Network Tree in the current frontend ([[Features/Feature - Network Tree|Feature - Network Tree]]), SSO/OIDC/LDAP, multi-tenant inventory isolation, production-validated non-SQLite storage, `/health`/`/metrics` endpoints. All tracked in [[Roadmap/Next Sprint|Next Sprint]] or [[Roadmap/v2 - Enterprise|v2 - Enterprise]].

## See also

[[Roadmap Overview]] · [[Development/Changelog|Changelog]]
