# Features

The detailed feature reference for the inventory UI itself. For the
enterprise/security/deployment feature set, see
[Enterprise Deployment](./enterprise.md) and [Security](./security.md)
instead — this page covers the day-to-day product surface: inventory
management, tags, the Network Tree, and the dashboard.

## Inventory management

- **Devices, Bandwidth Capping, and Subnets** — full CRUD for your
  inventory, with both a sortable table view and a card view, instant
  client-side search, pagination (10/25/50/100/All rows, with your
  preference remembered), and a responsive layout down to mobile. Click
  any column header to sort, click again to reverse. All of this runs
  entirely in the browser, so it works exactly the same whether the
  server is on your LAN or unreachable.
- **Generate YAML** — one config file per Collector Region, built from
  your current devices and bandwidth caps, with live preview and
  download. Devices configured for ICMP or SNMP Trap automatically hide
  the SNMPv3 credential form entirely, live, as you change the Config
  Type, since they don't need it. See [API Reference § Configuration
  generation](./api.md#config-generation--history-requires-deploymentexecute--profileread)
  for the underlying endpoint.
- **IP address validation** — both client-side (instant feedback while
  typing) and server-side (so a bad value can't sneak in through the API
  directly). Rows with an invalid IP or CIDR are skipped during import
  with a clear count rather than silently corrupting your data.
- **Excel import/export** — export your current data as an `.xlsx`
  template (including your custom tag columns), edit it offline, and
  re-import with a merge or replace mode. Credential column headers are
  alias-tolerant (`Auth Key`, `authKey`, `AuthKey` all map to the same
  field).

## Dynamic tags

- **Collector Region is the one fixed concept** — mandatory, and it's
  what Generate YAML groups files by. Everything else — Device Class,
  Region, Environment, Country, or anything you invent — is created on
  demand through **Manage Tags**, not hardcoded. A tag only exists once
  you create it.
- **One tag, many sections** — a tag can apply to Devices, Bandwidth
  Capping, and Subnets all at once, sharing a single value list across
  every section it's enabled for. Define "Environment" once, use it
  everywhere. Tag *creation* happens on **Manage Tags**; every tag's
  *value list* (alongside Collector Region's) lives on **Manage Lists**,
  so there's one place to curate every dropdown's options.
- **Tags render as real columns** — each tag shows up as its own column
  in every table (header = tag name, cell = value or empty), not packed
  into one generic "Tags" column.
- **Subnet-based tag inheritance** — tag a subnet once by CIDR instead
  of tagging every device in it individually. Any device whose IP falls
  inside that range inherits the tag for any value it doesn't already
  set itself, and the matched subnet is written into the generated YAML
  (`subnet: 10.1.1.0/24`) so it's traceable from the output alone.
- **Deleting something in use asks first.** Removing a tag, a tag value,
  or a Collector Region that's still referenced warns you with the
  affected record count before letting you proceed, and deleting a tag
  definition never deletes the records that used it, only the tag
  reference on them. Same rule applies to the tag delete endpoint — see
  [API Reference](./api.md).

## Network Tree

> [!WARNING]
> **Known gap, stated plainly:** the Network Tree described below was
> built for ConfigFoundry's original vanilla-JS frontend (`static/`) and
> has not yet been ported to the current Next.js frontend
> (`frontend/`). Whichever frontend is present at startup is served
> exclusively — see [Architecture § Frontend architecture](./architecture.md#frontend-architecture)
> — and the legacy frontend predates the authentication layer (its API
> client sends no bearer token), so it cannot be exposed as a working
> fallback alongside the current one. This is tracked in
> [Roadmap](./roadmap.md) as a real, open gap, not silently dropped.
> Everything else on this page is live in the current frontend.

Browsing hundreds of devices as a flat table makes it hard to see how
your network is actually laid out. The Network Tree is a spatial diagram
instead: Subnets on the left, branching to the Devices inside each one,
branching to that device's Bandwidth Capping rows on the right, built so
you can pan and zoom around a few hundred devices without losing your
place.

- **Pan and zoom, Google-Maps style**, with independent scrolling per
  column so a bucket with hundreds of devices doesn't make the whole
  diagram unusably tall.
- **Click a card to drill in** (subnet → its devices → their bandwidth
  rows); click the already-selected card again for a details panel with
  an **Edit** button that opens the same form used everywhere else in
  the app. Editing from the diagram updates your data immediately.
- **Hover to trace a connection** — highlights the connector lines down
  to everything beneath the card you're hovering, so you can see at a
  glance what belongs to what.
- **Unassigned buckets** for devices with no matching subnet and
  bandwidth rows with no matching device, instead of either disappearing
  silently.
- **Filter with `key:value` queries** (`collector_region:india`,
  `country:"AWS US"` — quote multi-word values) or the dropdowns next to
  the filter bar. Filtering narrows what's shown; it never changes the
  diagram's shape.

## Dashboard and everyday polish

- **Dashboard** — inventory totals with icon-bearing stat cards,
  breakdowns by Collector Region and any custom tag (correctly
  accounting for subnet-inherited values, not just directly-stored
  ones), generation status, and a recent-activity feed.
- **Dark and light mode** — toggle in the top bar, remembered in your
  browser, applied before the page even paints so there's no flash of
  the wrong theme. The same toggle and preference apply to the
  [in-app documentation viewer](/documentation/) you're reading this in.
- **Audit log + YAML history** — every change is attributed to whoever
  made it, and every generation is saved so you can look back at what
  was produced and when. See [API Reference](./api.md) and
  [RBAC](./rbac.md#permission-catalog) for `audit:read`.
- **Minimal, well-known dependencies.** The backend runs on FastAPI,
  SQLAlchemy 2.x, Pydantic v2, and uvicorn — all vendored for fully
  offline installs (see [Air-Gap Deployment](./airgap.md)). AES-256-GCM
  credential encryption and the YAML serializer are pure-Python with no
  additional dependencies.
- **Safe upgrades.** Every schema change ships as a versioned, idempotent
  Alembic migration that runs automatically on server startup — see
  [Upgrade Guide](./upgrade.md) and [Migrations](./migrations.md).

## What this deliberately isn't

- **Not a CMDB.** It tracks the fields needed to generate monitoring
  config (IP, region, credentials, a handful of tags), not ownership,
  lifecycle, warranty, or asset relationships beyond
  subnet/device/bandwidth.
- **Single-tenant inventory, multi-tenant auth.** The RBAC/API-key/policy
  layer is fully organization-scoped, but the inventory tables
  themselves aren't yet split per-organization — see
  [Enterprise § Multi-tenancy](./enterprise.md#multi-tenancy).
- **Single shared database, ordinary write semantics.** With SQLite (the
  default), two people editing the same record at the same moment is
  last-write-wins — there's no optimistic-locking or conflict warning.

> [!CAUTION]
> For the team-sized usage this was built for, last-write-wins hasn't
> been a problem in practice, but it isn't battle-tested under heavy
> concurrent write load. Move to PostgreSQL (see [Storage](./storage.md))
> if that matters for your deployment.
