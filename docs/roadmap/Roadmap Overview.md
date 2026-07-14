# Roadmap Overview

Parent: [Repository Overview](../reference/Repository Overview.md) · [Product Vision](../internal/product/Product Vision.md)

Reflects current thinking documented in `docs/roadmap.md`, not a committed calendar — ConfigFoundry does not operate on fixed release dates (see [Deployment Overview § Release process](../deployment/Deployment Overview.md#release-process)). Semantic versioning; see [Changelog](../../CHANGELOG.md) for what's actually shipped.

## Versioning strategy

| Version | Focus | Detail page |
|---|---|---|
| **v0.5.x (current)** | Bug fixes, stability, documentation, CI | [Current Sprint](Current Sprint.md) |
| v0.6.0 | Datadog config-push integration, configuration validation, inventory improvements, MIB management, observability endpoints | [Next Sprint](Next Sprint.md) |
| v0.7.0 | Enterprise capabilities: SQL Server, deeper audit/API-key tooling, Teams, SSO/LDAP, multi-tenant inventory | [v2 - Enterprise](v2 - Enterprise.md) |
| v0.8.x | Scalability: HA, reviewed plugin interface, performance | [v2 - Enterprise](v2 - Enterprise.md) |
| v0.9.x | Beta: API/config/installer freeze, community testing | [v1](v1.md) |
| **v1.0.0** | Production release — only once criteria below are met | [v1](v1.md) |

v1.0.0 requires, in full: a stable API (no breaking `/api/v1/` changes for a full release cycle), a stable database schema (migrations only), a stable, twice-proven installer/upgrade path, real production deployments, and community feedback from the v0.9.x beta. Not a fixed date — a checklist.

## Sub-pages

- [Current Sprint](Current Sprint.md) — v0.5.x stability work
- [Next Sprint](Next Sprint.md) — v0.6.0
- [MVP](MVP.md) — what already constitutes the minimum viable product (shipped)
- [v1](v1.md) — v0.9.x beta freeze through v1.0.0
- [v2 - Enterprise](v2 - Enterprise.md) — v0.7.0–v0.8.x
- [Future Ideas](Future Ideas.md) — unscheduled items and explicitly out-of-scope items
- [Long-term Vision](Long-term Vision.md)

## Deliberately out of scope

A built-in bug bounty/paid support program (self-hosted, community-maintained tool); a hosted/SaaS version (the entire air-gap-first, self-hosted design points the other direction on purpose); a plugin marketplace or dynamic third-party code loading (every integration is a reviewed, in-repo addition — see [Integrations Overview](../integrations/Integrations Overview.md)); GDPR-specific tooling (audit trail/RBAC foundation supports adding it later, SOC 2 was the primary compliance target so far).

## How to influence this list

Open an issue (see `CONTRIBUTING.md`). Items move up based on actual demand and fit with [the architecture principles](../architecture/Architecture Overview.md#principles), not a fixed voting mechanism.

## See also

[Product Vision](../internal/product/Product Vision.md) · [Changelog](../../CHANGELOG.md) · [Technical Debt](../development/Technical Debt.md)
