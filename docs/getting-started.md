# Getting Started

This gets you from a fresh clone to a running ConfigFoundry instance in
about five minutes, using SQLite (the zero-configuration default). For
production, air-gapped, or non-SQLite deployments, see
[Installation](./installation.md), [Air-Gap Deployment](./airgap.md), and
[Enterprise Deployment](./enterprise.md) instead.

## Prerequisites

- Python 3.10 or newer
- Node.js 18+ (only if you want to rebuild the frontend — a pre-built
  `frontend/out/` is included, so most people can skip installing Node
  entirely)

## 1. Install dependencies

With internet access:

```bash
pip install -r requirements.txt
```

Without internet access, see [Air-Gap Deployment](./airgap.md) — the
short version is `./install_offline.sh`.

## 2. Start the server

```bash
python3 server.py
```

You'll see something like:

```
============================================================
  ConfigFoundry is running
  Provider: sqlite
  Local:    http://localhost:8420/
  Database: /path/to/ConfigFoundry/db/configfoundry.db
============================================================
```

A browser tab opens automatically (pass `--no-browser` to disable that).
On first startup, ConfigFoundry creates a SQLite database, runs every
pending migration, and bootstraps a **Super Admin** account. The
generated credentials are printed once, to the console:

```
==============================================================================
ConfigFoundry: bootstrap Super Admin account created
  email:    admin@configfoundry.local
  password: <randomly generated>
  (password must be changed on first login)
==============================================================================
```

Save that password somewhere before it scrolls off — it isn't stored
anywhere in plaintext and isn't shown again. To control it instead of
letting one be generated, set `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` and
`CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` before the very first startup
(see [Configuration](./configuration.md)).

## 3. Log in

Open `http://localhost:8420/`, sign in with the bootstrap credentials,
and change the password when prompted. From there:

- **Inventory** → add your first devices, bandwidth caps, and subnets
  (or import from Excel via the same page).
- **Generate YAML** → produce the collector config from current inventory.
- **Settings → Security** → enroll MFA, review active sessions.
- **Admin → Users / Roles / API Keys / IP Policies** → set up additional
  accounts and access control before inviting anyone else in.

## 4. Explore the API

Interactive API docs are at `http://localhost:8420/docs` (Swagger UI) and
`http://localhost:8420/redoc` (ReDoc) — both self-hosted, no internet
required. Click **Authorize**, paste a JWT access token or API key, and
every protected endpoint becomes callable directly from the browser. See
[API Reference](./api.md) for the full endpoint list and
[Authentication](./authentication.md) for how to obtain a token.

## What's next

- Running this for a team? Read [RBAC](./rbac.md) and set up roles before
  handing out accounts.
- Deploying somewhere without internet access? Read
  [Air-Gap Deployment](./airgap.md).
- Putting this in front of real users? Read
  [Enterprise Deployment](./enterprise.md) and [Security](./security.md)
  first — the defaults are secure, but a few things (HTTPS termination,
  `CONFIGFOUNDRY_AUTH_JWT_SECRET`, CORS origins) are deployment-specific
  and worth setting deliberately rather than leaving at their
  development defaults.
