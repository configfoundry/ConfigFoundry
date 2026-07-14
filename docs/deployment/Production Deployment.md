# Production Deployment

Parent: [Deployment Overview](Deployment Overview.md) · [Security Overview](../security/Security Overview.md)

## Reverse proxy

Terminate TLS at the proxy; ConfigFoundry serves plain HTTP.

```nginx
server {
    listen 443 ssl;
    server_name configfoundry.yourcompany.example;
    ssl_certificate     /etc/ssl/certs/configfoundry.crt;
    ssl_certificate_key /etc/ssl/private/configfoundry.key;

    location / {
        proxy_pass http://127.0.0.1:8420;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` to the proxy's IP/CIDR — see [Access Policy Engine § Trusted proxy resolution](../security/Access Policy Engine.md#trusted-proxy-resolution) for why an unset/broad value is a real vulnerability.

## Running as a service (systemd)

```ini
# /etc/systemd/system/configfoundry.service
[Unit]
Description=ConfigFoundry
After=network.target

[Service]
Type=simple
User=configfoundry
WorkingDirectory=/opt/configfoundry
Environment=CONFIGFOUNDRY_AUTH_JWT_SECRET=...
Environment=CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY=...
ExecStart=/opt/configfoundry/.venv/bin/python3 server.py --no-browser
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Prefer `EnvironmentFile=/etc/configfoundry/env` (mode `600`) over inline `Environment=` lines for secrets.

## Database choice

SQLite is fine for a single-instance deployment of any size a small-to-mid team would produce. Move to PostgreSQL for concurrent write throughput beyond SQLite's single-writer model, or when policy requires a managed database server. See [Database Overview](../architecture/Database Overview.md).

## Zero-downtime notes

No rolling-restart/blue-green story is built in — a restart briefly interrupts service (migrations run automatically and are fast for incremental changes). Acceptable for most internal-tool deployments; if not, run a second instance behind the reverse proxy pointed at the same PostgreSQL database and drain traffic manually during upgrades.

> [!CAUTION]
> Multi-instance writes are not validated end-to-end against SQLite — use PostgreSQL if going this route.

## Firewall / network requirements

- Inbound: reverse proxy -> ConfigFoundry port (`8420` default), typically localhost-only or internal-segment-only.
- Outbound: **none required at runtime** — see [Air-Gap Deployment](Air-Gap Deployment.md).
- Database: outbound to the DB host/port only if using PostgreSQL/MySQL/SQL Server.

## Pre-go-live checklist

**Secrets:** `CONFIGFOUNDRY_AUTH_JWT_SECRET` and `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` set explicitly (not left to random-at-startup); bootstrap password set or captured and changed on first login; secrets injected via environment/secrets manager, never committed.

**Network:** TLS at reverse proxy; `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` set to exactly the proxy's CIDR; `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` set if cross-origin access is needed at all; Access Policy Engine IP rules configured where network segmentation is a compliance requirement.

**Identity & access:** `CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES` includes at minimum Super Admin and Organization Admin; custom roles reviewed against [RBAC Permission Catalog](../security/RBAC Permission Catalog.md) for least privilege; API keys scoped minimally with expirations set; a periodic access-review process exists.

**Data:** backup strategy in place and tested (see [Runbook - Backup & Recovery](runbooks/Runbook - Backup & Recovery.md)); managed database infrastructure if not SQLite; audit log retention policy agreed with compliance.

**Air-gap (if applicable):** `python3 scripts/validate_airgap.py` passes on the exact bundle; `install_offline.sh`/`.ps1` tested end-to-end with networking disabled.

**Operational:** running under a process supervisor with auto-restart; log shipping configured (`CONFIGFOUNDRY_LOG_JSON=true`, `CONFIGFOUNDRY_LOG_FILE`); health check wired into monitoring; upgrade path tested against a copy of production data first.

## Multi-tenancy caveat

The security layer is fully organization-scoped and ready for multiple tenants; the inventory tables are **not** — see [Database Overview](../architecture/Database Overview.md#future-schema-improvements). If hard multi-tenant inventory isolation is required today, run separate instances per tenant rather than relying on organization boundaries to isolate inventory records.

## See also

[Security Overview](../security/Security Overview.md) · [SOC 2 Compliance Mapping](../security/SOC 2 Compliance Mapping.md) · [Deployment Overview](Deployment Overview.md)
