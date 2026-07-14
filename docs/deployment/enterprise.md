# Enterprise Deployment

A hardening and readiness checklist for running ConfigFoundry in a
regulated or high-stakes environment — banks, government, defense,
healthcare, telecom. Read this alongside [Deployment](deployment.md)
(topology), [Air-Gap Deployment](airgap.md) (offline installation),
and [Security](../security/security.md) (the full security model this checklist
draws from).

## Before go-live checklist

**Secrets**
- [ ] `CONFIGFOUNDRY_AUTH_JWT_SECRET` set explicitly (not left to the
      random-at-startup default — see [Configuration](../reference/configuration.md)).
- [ ] `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` set explicitly and backed up in
      your secrets manager — losing it makes existing MFA enrollments
      undecryptable.
- [ ] `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` was set to a strong value
      *before* first startup, or the auto-generated one was captured and
      the bootstrap admin's password changed on first login.
- [ ] Secrets are injected via environment/secrets manager, never
      committed to a config file in version control.

**Network**
- [ ] TLS terminated at a reverse proxy (see [Deployment](deployment.md)).
- [ ] `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` set to exactly the proxy's
      IP/CIDR. **An unset or overly broad value lets a client spoof its
      own `X-Forwarded-For` and bypass the Access Policy Engine.**
- [ ] `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` set to the exact origin the
      frontend is served from, if cross-origin API access is needed at
      all (same-origin deployments — the default — need no CORS
      configuration).
- [ ] Access Policy Engine IP rules configured for any environment where
      network segmentation is a compliance requirement, not just a
      convenience.

**Identity & access**
- [ ] `CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES` includes at minimum Super
      Admin and Organization Admin.
- [ ] Custom roles reviewed against the [RBAC](../security/rbac.md) catalog —
      grant the minimum permission set each function actually needs
      rather than defaulting everyone to Organization Admin.
- [ ] API keys scoped to the minimum permission set and IP range needed
      for each integration/collector, with an expiration set.
- [ ] A process exists for periodic access review (who has which role —
      `GET /api/v1/users` + `GET /api/v1/roles`).

**Data**
- [ ] Database backup strategy in place and tested (see
      [Storage § Backups](../architecture/storage.md#backups)).
- [ ] If PostgreSQL/MySQL/SQL Server: the database itself is on your
      organization's standard managed/hardened database infrastructure,
      not a bespoke unmanaged instance.
- [ ] Retention policy for the audit log agreed with compliance —
      ConfigFoundry doesn't currently auto-purge audit records; that's a
      deliberate default (nothing disappears without an explicit action)
      but plan storage growth accordingly.

**Air-gap (if applicable)**
- [ ] `python3 scripts/validate_airgap.py` passes on the exact bundle
      being deployed.
- [ ] `install_offline.sh`/`.ps1` tested end-to-end on a machine with
      networking disabled, not just "should work."
      See [Air-Gap Deployment](airgap.md).

**Operational**
- [ ] Running under a process supervisor (systemd, etc.) with
      auto-restart — see [Deployment](deployment.md).
- [ ] Log shipping configured if you have centralized logging — set
      `CONFIGFOUNDRY_LOG_JSON=true` and `CONFIGFOUNDRY_LOG_FILE`, see
      [Logging](../architecture/logging.md).
- [ ] Health check wired into your monitoring — see [Monitoring](monitoring.md).
- [ ] Upgrade path tested against a copy of production data before the
      first real upgrade — see [Upgrade Guide](upgrade.md).

## Multi-tenancy

The security layer (users, roles, permissions, API keys, IP policies,
audit log) is fully organization-scoped and ready for multiple tenants
on one instance.

> [!IMPORTANT]
> The original inventory tables (devices, bandwidth, subnets, tags,
> lists, history) are **not yet** retrofitted with per-organization
> scoping — they remain effectively single-tenant, scoped to one seeded
> default organization. If your enterprise deployment needs hard
> multi-tenant separation of inventory data itself (not just of who can
> log in), run separate instances per tenant for now rather than relying
> on organization boundaries to isolate inventory records. See
> [Authentication § Known scope boundaries](../security/authentication.md#known-scope-boundaries)
> and [Roadmap](../roadmap/roadmap.md).

## Compliance mapping

A SOC 2 control mapping for the auth/RBAC/audit layer is maintained at
[compliance-soc2.md](../security/compliance-soc2.md).

## Support model

ConfigFoundry does not include a managed support contract or SLA by
default — this is a self-hosted tool your team operates. If your
organization needs a formal support agreement, that's a conversation to
have with whoever maintains your fork/deployment internally; nothing in
this documentation implies a vendor relationship.
