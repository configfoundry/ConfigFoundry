# Roadmap

What's planned, in version order, and what's deliberately out of scope.
This reflects current thinking, not a committed timeline — ConfigFoundry
doesn't operate on fixed release dates (see
[Release Process](./release-process.md)). Semantic versioning; see
[CHANGELOG.md](../CHANGELOG.md) for what's actually shipped so far.

## Versioning strategy

| Version | Focus |
|---|---|
| **v0.5.x** (current) | Bug fixes, stability, documentation, CI improvements |
| v0.6.0 | Datadog integration, configuration validation, inventory improvements, MIB management |
| v0.7.0 | Enterprise capabilities: SQL Server, deeper audit/API-key tooling, Teams, SSO, LDAP |
| v0.8.x | Scalability: HA, a reviewed plugin interface, performance |
| v0.9.x | Beta: API/config/installer freeze, community testing |
| v1.0.0 | Production release — only once the criteria below are met |

v1.0.0 requires, in full: a stable API (no breaking `/api/v1/` changes
for a full release cycle), a stable database schema (migrations only,
no manual intervention), a stable installer and upgrade path (both
proven across real upgrades, not just fresh installs), real production
deployments running it, and community feedback incorporated from the
v0.9.x beta. None of this is on a fixed date — it's a checklist, not a
calendar.

## v0.5.x — Stability (current)

**Port the Network Tree diagram to the Next.js frontend** — the
pan/zoom spatial device diagram (subnets → devices → bandwidth rows)
exists only in the original vanilla-JS frontend (`static/`), which is
fully superseded and no longer served once the Next.js build
(`frontend/out/`) is present (see
[Architecture § Frontend architecture](./architecture.md#frontend-architecture)).
The legacy frontend also predates the authentication layer, so it can't
be exposed as-is.

> [!IMPORTANT]
> This is the one feature genuinely unavailable in the current frontend
> rather than merely undocumented — see
> [Features § Network Tree](./features.md#network-tree) — and closing it
> is the highest priority in this bucket.

Otherwise: bug fixes, documentation, CI/release-engineering
improvements, and no new features — see [CHANGELOG.md](../CHANGELOG.md)
for what's landed under `[Unreleased]`. Also planned here:
**screenshots and a demo GIF** for the README, once the UI is visually
stable enough that they won't need re-capturing after every change.

## v0.6.0

**Datadog integration** — an export/forwarder for generated collector
config, kept strictly optional and dependent on core per the
[architecture principles](./architecture.md#principles) (core never
depends on an integration, only the reverse).

**Configuration validation** (Inventory Validation Engine) — stronger
cross-field validation at import/edit time (e.g. detecting a device
referencing a subnet that doesn't exist, or a bandwidth cap on a device
with no matching interface), beyond the current per-field format checks.

**Inventory improvements** — an Inventory Health Dashboard (stale
entries, validation warnings, coverage gaps at a glance), duplicate
detection at import time (same IP, similar hostname), device templates
for common device types, and YAML diff / change review between two
generated configs (`history` already records *that* a generation
happened; this adds *what changed*).

**MIB management** — importing and browsing vendor MIB files so SNMP
OIDs can be resolved to human-readable names in the UI, instead of
raw numeric OIDs only.

**Operational observability** — a `/health`/`/ready` endpoint pair and a
Prometheus-compatible `/metrics` endpoint, replacing the current
`/openapi.json`-as-liveness-check workaround described in
[Monitoring](./monitoring.md).

## v0.7.0 — Enterprise capabilities

> [!NOTE]
> Some items below already exist in some form today — this bucket is
> about *deepening* them, not building from zero. Stated plainly so
> the roadmap doesn't read as contradicting the current feature set.

- **SQL Server** — a real, production-validated implementation, not
  just the scaffolded interface described in [Storage](./storage.md).
- **Audit logs** — already shipped (every security-relevant event and
  business mutation is recorded, see [Security § Audit trail](./security.md#audit-trail));
  this bucket covers retention policies and export tooling.
- **Teams** — a collaboration/grouping layer above individual roles,
  distinct from the existing organization-scoped RBAC.
- **API keys** — already shipped (scoped, expiring service-account
  keys, see [RBAC](./rbac.md)); this bucket covers richer scoping and
  management UI.
- **External IdP / OIDC / SSO** — the token/claims model is already
  compatible (an external identity would map onto the existing `User`
  + `perm_version` + RBAC machinery), but no client code exists yet.
  See [Authentication § Known scope boundaries](./authentication.md#known-scope-boundaries).
- **LDAP** — directory-based authentication as an alternative to local
  password auth, for organizations with an existing directory.
- **Time-based access policies** — enforcing the maintenance-window /
  business-hours scaffolding that currently exists in the Access
  Policy Engine but always evaluates as allowed. See
  [Authorization § The Access Policy Engine](./authorization.md#the-access-policy-engine-ip-based-authorization).
- **Multi-tenant inventory scoping** — retrofitting `org_id` onto the
  original inventory tables (devices, bandwidth, subnets, tags, lists,
  history), which today are implicitly single-tenant even though the
  security layer around them is fully organization-scoped. A larger
  migration than the others on this list, touching every existing
  service. See [Enterprise § Multi-tenancy](./enterprise.md#multi-tenancy).

## v0.8.x — Scalability

- **High availability** — a documented, tested multi-instance topology
  behind a shared PostgreSQL database (see
  [Deployment § Zero-downtime notes](./deployment.md)), plus a
  Redis-backed rate limiter so multi-instance deployments share one
  limit instead of independent per-process ones (see
  [Security § Rate limiting](./security.md#rate-limiting)).
- **A reviewed plugin interface** — a defined extension point for
  in-repo, reviewed integrations. This is **not** the dynamic
  third-party code loading or plugin marketplace ruled out below —
  see [Deliberately out of scope](#deliberately-out-of-scope).
- **Performance** — profiling and addressing real bottlenecks at
  larger inventory sizes, once there's production usage data to
  profile against rather than guessing.

## v0.9.x — Beta

API, configuration format, and installer all frozen — no breaking
changes accepted during this phase. The point of the freeze is
community testing against something stable enough to be worth testing.

## Deliberately out of scope

> [!NOTE]
> - **A built-in bug bounty / paid support program** — this is a
>   self-hosted, community-maintained tool, not a vendor product.
> - **A hosted/SaaS version** — the entire design (offline-first,
>   air-gap-capable, self-hosted storage) points the other direction on
>   purpose.
> - **A plugin marketplace or dynamic code loading** — every integration
>   is expected to be a reviewed, in-repo addition; loading unreviewed
>   third-party code at runtime conflicts with the air-gap/security
>   posture this project targets.
> - **GDPR-specific tooling** (data export/erasure endpoints, consent
>   tracking) — the audit trail and RBAC foundation support adding this
>   later, but SOC 2 was this project's primary compliance target so far;
>   not committed to a timeline.

## How to influence this list

Open an issue — see [Contributing](./contributing.md). Items move up
this list based on actual demand and how well they fit the architecture
principles, not a fixed voting mechanism.
