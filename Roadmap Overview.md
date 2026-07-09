# Roadmap Overview

Parent: [[Repository Overview]] · [[Product/Product Vision|Product Vision]]

Reflects current thinking documented in `docs/roadmap.md`, not a committed calendar — ConfigFoundry does not operate on fixed release dates (see [[Deployment/Deployment Overview#Release process|Deployment Overview § Release process]]). Semantic versioning; see [[Development/Changelog|Changelog]] for what's actually shipped.

## Versioning strategy

| Version | Focus | Detail page |
|---|---|---|
| **v0.5.x (current)** | Bug fixes, stability, documentation, CI | [[Roadmap/Current Sprint|Current Sprint]] |
| v0.6.0 | Datadog config-push integration, configuration validation, inventory improvements, MIB management, observability endpoints | [[Roadmap/Next Sprint|Next Sprint]] |
| v0.7.0 | Enterprise capabilities: SQL Server, deeper audit/API-key tooling, Teams, SSO/LDAP, multi-tenant inventory | [[Roadmap/v2 - Enterprise|v2 - Enterprise]] |
| v0.8.x | Scalability: HA, reviewed plugin interface, performance | [[Roadmap/v2 - Enterprise|v2 - Enterprise]] |
| v0.9.x | Beta: API/config/installer freeze, community testing | [[Roadmap/v1|v1]] |
| **v1.0.0** | Production release — only once criteria below are met | [[Roadmap/v1|v1]] |

v1.0.0 requires, in full: a stable API (no breaking `/api/v1/` changes for a full release cycle), a stable database schema (migrations only), a stable, twice-proven installer/upgrade path, real production deployments, and community feedback from the v0.9.x beta. Not a fixed date — a checklist.

## Sub-pages

- [[Roadmap/Current Sprint|Current Sprint]] — v0.5.x stability work
- [[Roadmap/Next Sprint|Next Sprint]] — v0.6.0
- [[Roadmap/MVP|MVP]] — what already constitutes the minimum viable product (shipped)
- [[Roadmap/v1|v1]] — v0.9.x beta freeze through v1.0.0
- [[Roadmap/v2 - Enterprise|v2 - Enterprise]] — v0.7.0–v0.8.x
- [[Roadmap/Future Ideas|Future Ideas]] — unscheduled items and explicitly out-of-scope items
- [[Roadmap/Long-term Vision|Long-term Vision]]

## Deliberately out of scope

A built-in bug bounty/paid support program (self-hosted, community-maintained tool); a hosted/SaaS version (the entire air-gap-first, self-hosted design points the other direction on purpose); a plugin marketplace or dynamic third-party code loading (every integration is a reviewed, in-repo addition — see [[Integrations Documentation/Integrations Overview|Integrations Overview]]); GDPR-specific tooling (audit trail/RBAC foundation supports adding it later, SOC 2 was the primary compliance target so far).

## How to influence this list

Open an issue (see `CONTRIBUTING.md`). Items move up based on actual demand and fit with [[Architecture Overview#Principles|the architecture principles]], not a fixed voting mechanism.

## See also

[[Product/Product Vision|Product Vision]] · [[Development/Changelog|Changelog]] · [[Development/Technical Debt|Technical Debt]]
