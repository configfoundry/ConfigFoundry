# ConfigFoundry Documentation

ConfigFoundry is a shared SNMP/ICMP collector configuration generator: a
single source of truth for network device inventory, bandwidth caps, and
subnet definitions, with a web UI and REST API that generate collector
YAML configs on demand. It ships with enterprise authentication (JWT +
MFA + API keys), fine-grained RBAC, an IP-based Access Policy Engine, a
storage abstraction that runs on SQLite or PostgreSQL/MySQL/SQL Server,
and a fully air-gap-capable deployment path.

This is the documentation home. Pick where you're starting from:

## New to ConfigFoundry

- **[Getting Started](getting-started/getting-started.md)** — the fastest path from zero to a running instance.
- **[Installation](getting-started/installation.md)** — every installation method in detail (release bundle, source, offline-from-source).
- **[Features](getting-started/features.md)** — the full product feature reference: inventory management, dynamic tags, the Network Tree, dashboard.
- **[FAQ](getting-started/faq.md)** — quick answers to the questions people actually ask.

## Deploying in a locked-down environment

- **[Air-Gap Deployment Guide](deployment/airgap.md)** — how ConfigFoundry runs with zero internet access, how the offline dependency bundles work, and how to update them.
- **[Enterprise Deployment](deployment/enterprise.md)** — hardening checklist, reverse proxy/TLS termination, backup strategy, multi-instance notes.
- **[Security](security/security.md)** — the security model end-to-end: what's enforced, what's the deployer's responsibility, how to report a vulnerability.
- **[Configuration Reference](reference/configuration.md)** — every environment variable and config-file option.

## Building on top of ConfigFoundry

- **[Architecture](architecture/architecture.md)** — how the pieces fit together, with diagrams.
- **[API Reference](api/api.md)** and **[API Versioning](api/api-versioning.md)** — every REST endpoint, request/response shapes, auth requirements, and how `/api/v2/` would be added without breaking `/api/v1/`.
- **[Authentication](security/authentication.md)**, **[Authorization](security/authorization.md)**, **[RBAC](security/rbac.md)** — the security layer in depth.
- **[Storage](architecture/storage.md)** and **[Migrations](architecture/migrations.md)** — the database abstraction and schema evolution.
- **[Logging](architecture/logging.md)** — the structured logging framework.
- **[SOC 2 Compliance Mapping](security/compliance-soc2.md)** — how the auth/RBAC/audit layer maps to SOC 2 controls.

## Operating ConfigFoundry

- **[Deployment](deployment/deployment.md)** — production deployment topologies.
- **[Monitoring](deployment/monitoring.md)** — health checks, metrics, what to alert on.
- **[Upgrade Guide](deployment/upgrade.md)** — how to move between versions safely.
- **[Troubleshooting](deployment/troubleshooting.md)** — common problems and their real fixes.
- **[Release Process](development/release-process.md)** — how ConfigFoundry versions are cut and shipped.

## Contributing

- **[Development Guide](development/development.md)** — running ConfigFoundry from source, project layout, testing.
- **[Contributing](development/contributing.md)** — how to propose changes.
- **[Roadmap](roadmap/roadmap.md)** — what's planned, what's deliberately out of scope.

## Deep dives (engineering reference)

The pages above are the primary guides; each links out to a deeper reference
layer covering diagrams, individual REST endpoint groups, per-feature
detail, architecture decision records, and operational runbooks. Starting
points if you want to browse that layer directly rather than following
links from the pages above:

- **[Architecture Overview](architecture/Architecture Overview.md)** — expands on [Architecture](architecture/architecture.md) with the Monitoring Platform pipeline, all system diagrams, and links to [Backend Overview](architecture/Backend Overview.md), [Frontend Overview](architecture/Frontend Overview.md), and [Database Overview](architecture/Database Overview.md).
- **[ADR Index](adr/ADR Index.md)** — every Architecture Decision Record (ADR-0001 through ADR-0008), why each decision was made.
- **[API Overview](api/API Overview.md)** — index of all seven REST endpoint-group pages (Auth, Users & Roles, Inventory, Tags & Lists, Generate & History, Export, API Keys & Policies).
- **[Security Overview](security/Security Overview.md)** — expands on [Security](security/security.md) with the CSP design, vulnerability notes, and links to [Access Policy Engine](security/Access Policy Engine.md), [RBAC Permission Catalog](security/RBAC Permission Catalog.md), and [Secrets & Configuration](security/Secrets & Configuration.md).
- **[Engineering Wiki](development/Engineering Wiki.md)** — coding standards, naming conventions, branch/commit/review process.
- **[Deployment Overview](deployment/Deployment Overview.md)** and **[Operations](deployment/runbooks/Operations.md)** — CI/CD pipeline, release process, and the full runbook set (backup & recovery, incident response, troubleshooting, monitoring, deployment).
- **[Integrations Overview](integrations/Integrations Overview.md)** — the architectural contract for external-system integrations, including [Datadog APM](integrations/Datadog APM.md).
- **[Roadmap Overview](roadmap/Roadmap Overview.md)** — expands on [Roadmap](roadmap/roadmap.md) with per-cycle detail pages (Current Sprint, Next Sprint, MVP, v1, v2 - Enterprise, Future Ideas, Long-term Vision).
- **[Repository Overview](reference/Repository Overview.md)** — full repo tour: folder structure, entry points, config files, runtime flow.
- **[Features index](reference/features/Features.md)** — one page per feature, deeper than the [Features](getting-started/features.md) summary.
- **[Glossary](reference/Glossary.md)** — terminology used throughout this documentation set.

---

Looking for the project overview instead of the docs? See the
[README](../README.md).
