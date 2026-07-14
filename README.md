<p align="center">
  <img src="/static/logo.svg" alt="ConfigFoundry" width="100%">
</p>

<p align="center">
  <a href="https://github.com/configfoundry/ConfigFoundry"><img alt="repo" src="https://img.shields.io/badge/github-configfoundry%2FConfigFoundry-181717?logo=github"></a>
  <img alt="status" src="https://img.shields.io/badge/status-enterprise%20preview%20(v0.5)-brightgreen">
  <img alt="python" src="https://img.shields.io/badge/python-3.10%2B-blue">
  <img alt="airgap" src="https://img.shields.io/badge/deployment-air--gap%20capable-informational">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-lightgrey">
</p>

<p align="center">
  A shared, self-hosted tool for generating SNMP/ICMP collector config YAML
  from a team-maintained inventory of network devices, bandwidth caps, and subnets —
  with enterprise authentication, RBAC, and a fully offline, air-gap-capable
  deployment path.
</p>

<p align="center">
  <a href="docs/getting-started/getting-started.md">Getting Started</a> ·
  <a href="docs/index.md">Documentation</a> ·
  <a href="docs/deployment/airgap.md">Air-Gap Deployment</a> ·
  <a href="docs/api/api.md">API Reference</a>
</p>

---

## Overview

Network teams often track device inventory in a spreadsheet and hand-roll
monitoring config from it. ConfigFoundry replaces that with a small shared
web server: one person runs it on an always-on machine, and everyone on the
team opens it in a browser to manage the same dataset together — no
per-person spreadsheet copies, no merge conflicts, no "whose version is
current?"

What you get instead of a spreadsheet: multi-user access from one shared
dataset, input validation, an audit log of who changed what, and YAML
generation that's always derived from current data instead of copy-pasted by
hand — plus, if your environment needs it, a full enterprise security layer
(JWT + MFA + API keys + RBAC + IP policies) and an installation path that
works with zero internet access.

Architecture in one line: `Browser → Next.js static export → FastAPI →
middleware → routes → service layer → repository layer → StorageProvider
(SQLite / PostgreSQL / MySQL / SQL Server)`, layered so each depends only on
the one below it through an explicit interface. Full diagram, request
lifecycle, and module layout: [docs/architecture/architecture.md](docs/architecture/architecture.md).

## Features

- **Inventory management** — devices, bandwidth caps, and subnets with full
  CRUD, search, sort, pagination, and Excel import/export.
- **Dynamic tags** — define your own classification (Region, Environment,
  Device Class, anything) instead of hardcoded fields, with subnet-based
  inheritance so you tag a `/24` once instead of every device in it.
- **Network Tree diagram** — a pan/zoom spatial view of subnets → devices →
  bandwidth rows. *(Currently only in the legacy frontend, not yet ported to
  the Next.js UI — see [Features § Network Tree](docs/getting-started/features.md#network-tree)
  for the honest status of this one.)*
- **Enterprise authentication & RBAC** — Argon2id passwords, JWT + rotating
  refresh tokens, TOTP MFA, API keys, fine-grained permission-code
  authorization, an IP-based Access Policy Engine, a full audit trail, and a
  same-origin-only Content-Security-Policy with no CDN dependency anywhere —
  built for regulated and locked-down environments (banks, government,
  defense, healthcare, telecom). See [Security](docs/security/security.md)
  and [RBAC](docs/security/rbac.md).
- **Storage abstraction** — SQLite by default (zero configuration), with
  PostgreSQL/MySQL/SQL Server as a config change away. See
  [Storage](docs/architecture/storage.md).
- **Air-gap deployment** — install and run with zero internet access,
  verified automatically in CI. See [Air-Gap Deployment](docs/deployment/airgap.md)
  and [Enterprise Deployment](docs/deployment/enterprise.md) for the
  pre-go-live checklist.

Full feature reference, including what ConfigFoundry deliberately isn't:
[docs/getting-started/features.md](docs/getting-started/features.md).

## Quick start

The git repository is source only — no prebuilt frontend, no vendored
npm packages — which is what keeps `git clone` lightweight.

```bash
git clone https://github.com/configfoundry/ConfigFoundry.git
cd ConfigFoundry
pip install -r requirements.txt
python3 server.py
```

This works immediately — no build step required — but serves
ConfigFoundry's legacy static UI, since `frontend/out/` doesn't exist
yet in a bare clone. For the current Next.js UI:

```bash
make dev      # backend :8420 + Next.js dev server :3001, live-reloading
make serve    # builds frontend/out/, then single-port serve
```

Either way it opens `http://localhost:8420/` automatically, creates
`db/configfoundry.db`, and prints the bootstrap Super Admin's
credentials to the console on first startup. Full walkthrough:
[docs/getting-started/getting-started.md](docs/getting-started/getting-started.md).

## Installation

No internet access on the target machine? Download
`ConfigFoundry-Offline-vX.Y.Z.zip` from GitHub Releases (or build one
yourself with `./scripts/build_release_bundle.sh`) — it ships a
prebuilt frontend and every dependency vendored, so it installs and
runs with **zero internet access**: no PyPI, npm registry, GitHub, or
CDN of any kind.

```bash
unzip ConfigFoundry-Offline-vX.Y.Z.zip && cd ConfigFoundry-Offline-vX.Y.Z
./install_offline.sh   # or install_offline.ps1 on Windows
./run_offline.sh
```

This is verified automatically by `scripts/validate_airgap.py` and a CI
job that firewalls the runner off from PyPI/npm before proving the
install still works. Full explanation: [docs/deployment/airgap.md](docs/deployment/airgap.md),
every installation method side by side: [docs/getting-started/installation.md](docs/getting-started/installation.md).

## Documentation

The full documentation set lives in [`docs/`](docs/index.md) and is also
browsable inside the running app at **`/documentation`**, with search,
breadcrumbs, prev/next navigation, dark/light theme, and a table of
contents — fully static, works offline. (Deliberately not `/docs` — that
path is reserved for FastAPI's Swagger UI, below.) It's organized by topic:

| Section | Covers | Start here |
|---|---|---|
| [Getting Started](docs/getting-started/) | First run, installation methods, features, FAQ | [getting-started.md](docs/getting-started/getting-started.md) |
| [Architecture](docs/architecture/) | System design, request lifecycle, diagrams, storage, logging | [architecture.md](docs/architecture/architecture.md) |
| [Architecture Decisions](docs/adr/) | ADRs — why the system is built the way it is | [ADR Index.md](docs/adr/ADR Index.md) |
| [API](docs/api/) | Every REST endpoint, request/response shapes, versioning | [api.md](docs/api/api.md) |
| [Security](docs/security/) | Auth, RBAC, MFA, API keys, IP policies, SOC 2 mapping | [security.md](docs/security/security.md) |
| [Development](docs/development/) | Running from source, testing, contributing, releases | [development.md](docs/development/development.md) |
| [Deployment](docs/deployment/) | Production topologies, air-gap, upgrades, runbooks | [deployment.md](docs/deployment/deployment.md) |
| [Integrations](docs/integrations/) | Datadog APM and other external-system integrations | [Integrations Overview.md](docs/integrations/Integrations Overview.md) |
| [Roadmap](docs/roadmap/) | What's planned, what's deliberately out of scope | [roadmap.md](docs/roadmap/roadmap.md) |
| [Reference](docs/reference/) | Config options, glossary, repository tour, feature deep-dives | [configuration.md](docs/reference/configuration.md) |

Interactive API docs (Swagger UI / ReDoc, self-hosted, no CDN) are always
available at `http://localhost:8420/docs` and `/redoc` on a running instance.

## Contributing

Issues and pull requests are welcome at
[github.com/configfoundry/ConfigFoundry](https://github.com/configfoundry/ConfigFoundry).
The project optimizes for running on locked-down, offline, single-team
infrastructure over almost anything else — a PR that trades that away for
convenience (a new dependency, an assumption the internet is reachable)
should expect pushback on the tradeoff, not the code itself. Full guide,
including a few codebase-specific gotchas worth knowing before you dive in:
[CONTRIBUTING.md](CONTRIBUTING.md) (quick process) and
[docs/development/contributing.md](docs/development/contributing.md) (technical depth).

See [CHANGELOG.md](CHANGELOG.md) for what shipped and
[docs/roadmap/roadmap.md](docs/roadmap/roadmap.md) for the plan toward v1.0.

## License

MIT — see [LICENSE](LICENSE).
