# Roadmap

What's planned, roughly in priority order, and what's deliberately out
of scope. This reflects current thinking, not a committed timeline —
ConfigFoundry doesn't operate on fixed release dates (see
[Release Process](./release-process.md)).

## Planned

**Port the Network Tree diagram to the Next.js frontend** — the
pan/zoom spatial device diagram (subnets → devices → bandwidth rows)
exists only in the original vanilla-JS frontend (`static/`), which is
fully superseded and no longer served once the Next.js build
(`frontend/out/`) is present (see
[Architecture § Frontend architecture](./architecture.md#frontend-architecture)).
The legacy frontend also predates the authentication layer, so it can't
be exposed as-is. This is the one feature genuinely unavailable in the
current frontend rather than merely undocumented — see
[Features § Network Tree](./features.md#network-tree) — and closing it
is a higher priority than the items below.

**Inventory Validation Engine** (highest priority) — stronger
cross-field validation at import/edit time (e.g. detecting a device
referencing a subnet that doesn't exist, or a bandwidth cap on a device
with no matching interface), beyond the current per-field format checks.

**Inventory Health Dashboard** — a summary view surfacing stale entries,
validation warnings, and coverage gaps at a glance instead of only
discoverable through individual list views.

**Duplicate detection** — flagging likely-duplicate devices/subnets
(same IP, similar hostname) at import time.

**Device templates** — predefined field sets for common device types, to
speed up manual entry.

**YAML diff / change review** — showing what changed between two
generated configs before it's applied downstream, rather than only
recording that a generation happened (`history` already records *that*;
this would add *what changed*).

**First external integration** — most likely a Datadog export or SNMP
auto-discovery feed, kept strictly optional and dependent on core per
the [architecture principles](./architecture.md#principles) (core never
depends on an integration, only the reverse).

**Operational observability** — a `/health`/`/ready` endpoint pair and a
Prometheus-compatible `/metrics` endpoint, replacing the current
`/openapi.json`-as-liveness-check workaround described in
[Monitoring](./monitoring.md).

**External IdP / OIDC / SSO** — the token/claims model is already
compatible (an external identity would map onto the existing `User` +
`perm_version` + RBAC machinery), but no client code exists yet. See
[Authentication § Known scope boundaries](./authentication.md#known-scope-boundaries).

**Distributed rate limiting** — a Redis-backed limiter behind the
existing interface, for multi-instance deployments that currently get
independent per-process limits. See
[Security § Rate limiting](./security.md#rate-limiting).

**Time-based access policies** — enforcing the maintenance-window/
business-hours scaffolding that currently exists in the Access Policy
Engine but always evaluates as allowed. See
[Authorization § The Access Policy Engine](./authorization.md#the-access-policy-engine-ip-based-authorization).

**Multi-tenant inventory scoping** — retrofitting `org_id` onto the
original inventory tables (devices, bandwidth, subnets, tags, lists,
history), which today are implicitly single-tenant even though the
security layer around them is fully organization-scoped. A larger
migration than the others on this list, touching every existing
service. See [Enterprise § Multi-tenancy](./enterprise.md#multi-tenancy).

**Screenshots and a demo GIF** in the README, once the UI is visually
stable enough that they won't need re-capturing after every change.

**Version 1.0 release**, once the above core-feature gaps close and the
API has had a full stable release cycle without a breaking change.

## Deliberately out of scope

- **A built-in bug bounty / paid support program** — this is a
  self-hosted, community-maintained tool, not a vendor product.
- **A hosted/SaaS version** — the entire design (offline-first,
  air-gap-capable, self-hosted storage) points the other direction on
  purpose.
- **A plugin marketplace or dynamic code loading** — every integration
  is expected to be a reviewed, in-repo addition; loading unreviewed
  third-party code at runtime conflicts with the air-gap/security
  posture this project targets.
- **GDPR-specific tooling** (data export/erasure endpoints, consent
  tracking) — the audit trail and RBAC foundation support adding this
  later, but SOC 2 was this project's primary compliance target so far;
  not committed to a timeline.

## How to influence this list

Open an issue — see [Contributing](./contributing.md). Items move up
this list based on actual demand and how well they fit the architecture
principles, not a fixed voting mechanism.
