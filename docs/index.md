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

- **[Getting Started](./getting-started.md)** — the fastest path from zero to a running instance.
- **[Installation](./installation.md)** — every installation method in detail (release bundle, source, offline-from-source).
- **[Features](./features.md)** — the full product feature reference: inventory management, dynamic tags, the Network Tree, dashboard.
- **[FAQ](./faq.md)** — quick answers to the questions people actually ask.

## Deploying in a locked-down environment

- **[Air-Gap Deployment Guide](./airgap.md)** — how ConfigFoundry runs with zero internet access, how the offline dependency bundles work, and how to update them.
- **[Enterprise Deployment](./enterprise.md)** — hardening checklist, reverse proxy/TLS termination, backup strategy, multi-instance notes.
- **[Security](./security.md)** — the security model end-to-end: what's enforced, what's the deployer's responsibility, how to report a vulnerability.
- **[Configuration Reference](./configuration.md)** — every environment variable and config-file option.

## Building on top of ConfigFoundry

- **[Architecture](./architecture.md)** — how the pieces fit together, with diagrams.
- **[API Reference](./api.md)** and **[API Versioning](./api-versioning.md)** — every REST endpoint, request/response shapes, auth requirements, and how `/api/v2/` would be added without breaking `/api/v1/`.
- **[Authentication](./authentication.md)**, **[Authorization](./authorization.md)**, **[RBAC](./rbac.md)** — the security layer in depth.
- **[Storage](./storage.md)** and **[Migrations](./migrations.md)** — the database abstraction and schema evolution.
- **[Logging](./logging.md)** — the structured logging framework.
- **[SOC 2 Compliance Mapping](./compliance-soc2.md)** — how the auth/RBAC/audit layer maps to SOC 2 controls.

## Operating ConfigFoundry

- **[Deployment](./deployment.md)** — production deployment topologies.
- **[Monitoring](./monitoring.md)** — health checks, metrics, what to alert on.
- **[Upgrade Guide](./upgrade.md)** — how to move between versions safely.
- **[Troubleshooting](./troubleshooting.md)** — common problems and their real fixes.
- **[Release Process](./release-process.md)** — how ConfigFoundry versions are cut and shipped.

## Contributing

- **[Development Guide](./development.md)** — running ConfigFoundry from source, project layout, testing.
- **[Contributing](./contributing.md)** — how to propose changes.
- **[Roadmap](./roadmap.md)** — what's planned, what's deliberately out of scope.

---

Looking for the project overview instead of the docs? See the
[README](../README.md).
