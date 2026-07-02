# FAQ

**Does ConfigFoundry require internet access to run?**
No. Install and runtime are both fully offline-capable — see
[Air-Gap Deployment](./airgap.md). Only regenerating the offline vendor
bundles (when bumping a dependency version) needs internet access, and
that's a build-time step, never a runtime one.

**Do I need Node.js installed?**
Only if you're rebuilding the frontend from source. The release bundle
and a normal git clone both include a pre-built `frontend/out/` static
export, so most installs never touch Node. See
[Installation](./installation.md).

**What database should I use?**
SQLite by default — zero configuration, one file, fine for small and
mid-sized teams. Move to PostgreSQL for larger or multi-instance
deployments. See [Storage](./storage.md).

**Is multi-tenancy supported?**
The security layer (users, roles, API keys, policies, audit) is fully
organization-scoped and ready for it. The inventory tables (devices,
bandwidth, subnets, etc.) are not yet retrofitted with per-organization
scoping. See [Enterprise § Multi-tenancy](./enterprise.md#multi-tenancy).

**How do I get API access for a script or collector, without a human login?**
Create an API key (`POST /api/v1/api-keys`, requires `api:manage`) — it
can be scoped to a specific permission list, IP allowlist, and
expiration. Use it as `Authorization: Bearer cfk_live_...`. See
[Authentication](./authentication.md).

**Is MFA required?**
Not by default. Set `CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES` to enforce
it for specific roles (Super Admin and Organization Admin are strongly
recommended at minimum for anything beyond a personal instance). See
[Configuration](./configuration.md).

**How do I reset my own password?**
`POST /api/v1/auth/password/change` while logged in. If you've lost
access entirely, another admin can reset it via
`POST /api/v1/users/{id}/reset-password` — see
[Troubleshooting](./troubleshooting.md).

**Can I run multiple instances behind a load balancer?**
Not validated for SQLite (single-writer limitation). With PostgreSQL as
the shared backend, multiple instances can point at the same database,
though there's no built-in session affinity requirement — the
JWT/refresh-token model doesn't need sticky sessions. Rate limiting is
per-process, so each instance enforces its own independent limit rather
than a shared global one. See [Deployment](./deployment.md).

**Where do generated YAML configs go?**
`POST /api/v1/generate` returns the generated config in the response and
records it in `history` (`GET /api/v1/history`) — nothing is written to
disk automatically. Save the response wherever your deployment pipeline
expects it.

**How is this different from just using a shared spreadsheet?**
Multi-user concurrent access to one dataset (no per-person copies to
reconcile), input validation, an audit trail of every change, and
generated YAML that's always derived from current data rather than
hand-copied. See the README's "Why this exists" section.

**Does ConfigFoundry send any data externally — telemetry, analytics, update checks?**
No. There is no telemetry, analytics beacon, or phone-home update check
of any kind. This is enforced by the same air-gap validation that checks
for CDN/external-asset references — see [Air-Gap Deployment](./airgap.md).

**How often are dependencies updated?**
No fixed cadence currently — see [Release Process](./release-process.md)
for how a release is cut and [Roadmap](./roadmap.md) for what's planned.

**I found a security issue. Where do I report it?**
See [Security § Reporting a vulnerability](./security.md#reporting-a-vulnerability).

**Can I add a new database provider / new integration?**
Yes — both are designed as extension points. See
[Storage § Adding a new provider](./storage.md#adding-a-new-provider) and
[Architecture § Layering rules](./architecture.md#layering-rules) for
why integrations depend on core and never the reverse.
