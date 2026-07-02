<p align="center">
  <img src="/static/logo.svg" alt="ConfigFoundry" width="100%">
</p>

<p align="center">
  <a href="https://github.com/shivamsancc/ConfigFoundry"><img alt="repo" src="https://img.shields.io/badge/github-shivamsancc%2FConfigFoundry-181717?logo=github"></a>
  <img alt="status" src="https://img.shields.io/badge/status-active-brightgreen">
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
  <a href="docs/getting-started.md">Getting Started</a> ·
  <a href="docs/index.md">Documentation</a> ·
  <a href="docs/airgap.md">Air-Gap Deployment</a> ·
  <a href="docs/api.md">API Reference</a>
</p>

---

## Why this exists

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
works with zero internet access. See [FAQ](docs/faq.md) for the questions
people actually ask, and [Features](docs/features.md) for what "isn't a CMDB"
and "single shared database" mean in practice before you adopt it.

## Screenshots

Not included in this revision yet — tracked in [Roadmap](docs/roadmap.md).
Run it yourself (five minutes, see Quick Start below) rather than relying on
descriptions here.

## Features

- **Inventory management** — devices, bandwidth caps, and subnets with full
  CRUD, search, sort, pagination, and Excel import/export.
- **Dynamic tags** — define your own classification (Region, Environment,
  Device Class, anything) instead of hardcoded fields, with subnet-based
  inheritance so you tag a `/24` once instead of every device in it.
- **Network Tree diagram** — a pan/zoom spatial view of subnets → devices →
  bandwidth rows. *(Currently only in the legacy frontend, not yet ported to
  the Next.js UI — see [Features § Network Tree](docs/features.md#network-tree)
  for the honest status of this one.)*
- **Enterprise authentication & RBAC** — Argon2id passwords, JWT + rotating
  refresh tokens, TOTP MFA, API keys, fine-grained permission-code
  authorization, an IP-based Access Policy Engine, and a full audit trail.
  See [Security](docs/security.md) and [RBAC](docs/rbac.md).
- **Storage abstraction** — SQLite by default (zero configuration), with
  PostgreSQL/MySQL/SQL Server as a config change away. See
  [Storage](docs/storage.md).
- **Air-gap deployment** — install and run with zero internet access,
  verified automatically in CI. See [Air-Gap Deployment](docs/airgap.md).

Full feature reference, including what ConfigFoundry deliberately isn't:
[docs/features.md](docs/features.md).

## Architecture overview

```
Browser → Next.js static export (same origin) → FastAPI (app.py)
            → middleware (access policy, rate limit, security headers)
            → routes → service layer → repository layer
            → StorageProvider (SQLite / PostgreSQL / MySQL / SQL Server)
```

Layered, with each layer depending only on the one below it through an
explicit interface — repositories never import a database driver directly,
services never contain HTTP code, routes never contain business logic. Full
diagram, request lifecycle, and module layout:
[docs/architecture.md](docs/architecture.md).

## Quick start

The git repository is source only — no prebuilt frontend, no vendored
npm packages — which is what keeps `git clone` lightweight. Two ways to
run it, depending on what you have:

**From source (needs Python; Node only if you want the current UI):**

```bash
git clone https://github.com/shivamsancc/ConfigFoundry.git
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
[docs/getting-started.md](docs/getting-started.md).

**From a release bundle (no Node, no internet, anywhere):**

```bash
unzip ConfigFoundry-Offline-vX.Y.Z.zip && cd ConfigFoundry-Offline-vX.Y.Z
./install_offline.sh   # or install_offline.ps1 on Windows
./run_offline.sh
```

This is the zero-internet, zero-Node path — the release bundle ships a
prebuilt frontend and a full offline dependency vendor bundle that the
git repository itself intentionally doesn't carry. Get one from GitHub
Releases or build it yourself (`./scripts/build_release_bundle.sh`).
See [Air-Gap Deployment](docs/airgap.md) for the full explanation and
[Installation](docs/installation.md) for every method side by side.

## Documentation

The full documentation set lives in [`docs/`](docs/index.md) and is also
browsable inside the running app at **`/documentation`**, with search,
breadcrumbs, prev/next navigation, dark/light theme, and a table of
contents — fully static, works offline. (Deliberately not `/docs` — that
path is reserved for FastAPI's Swagger UI, below.) Highlights:

| Topic | Page |
|---|---|
| First run walkthrough | [docs/getting-started.md](docs/getting-started.md) |
| Every installation method | [docs/installation.md](docs/installation.md) |
| Zero-internet-access deployment | [docs/airgap.md](docs/airgap.md) |
| System design, request lifecycle, diagrams | [docs/architecture.md](docs/architecture.md) |
| Every REST endpoint | [docs/api.md](docs/api.md) |
| Auth, RBAC, MFA, API keys, IP policies | [docs/security.md](docs/security.md) |
| Every config option / env var | [docs/configuration.md](docs/configuration.md) |
| Production deployment & hardening | [docs/deployment.md](docs/deployment.md), [docs/enterprise.md](docs/enterprise.md) |
| Common problems, real fixes | [docs/troubleshooting.md](docs/troubleshooting.md) |

Interactive API docs (Swagger UI / ReDoc, self-hosted, no CDN) are always
available at `http://localhost:8420/docs` and `/redoc` on a running instance.

## Air-gap deployment

Every dependency is vendored and pinned; every static asset is self-hosted.
`install_offline.sh`/`.ps1` install and run ConfigFoundry with **zero
internet access** — no PyPI, npm registry, GitHub, or CDN of any kind —
verified automatically by `scripts/validate_airgap.py` and a CI job that
firewalls the runner off from PyPI before proving the install still works.
Release bundles (`ConfigFoundry-Offline-vX.Y.Z.zip`) ship everything needed
in one archive. Full explanation: [docs/airgap.md](docs/airgap.md).

## Enterprise features

Built for regulated and locked-down environments: banks, government,
defense, healthcare, telecom. Argon2id + JWT + rotating refresh tokens +
TOTP MFA + API keys, permission-code RBAC (never a hardcoded role check), an
IP-based Access Policy Engine, a full audit trail, and a same-origin-only
Content-Security-Policy with no CDN dependency anywhere. See
[docs/enterprise.md](docs/enterprise.md) for the pre-go-live checklist and
[docs/security.md](docs/security.md) for the full security model.

## Roadmap

Highest priority right now: porting the Network Tree diagram to the
current frontend (see Features above), an Inventory Validation Engine, and
operational observability (`/health`, `/metrics`). Full list, plus what's
deliberately out of scope: [docs/roadmap.md](docs/roadmap.md).

## Contributing

Issues and pull requests are welcome at
[github.com/shivamsancc/ConfigFoundry](https://github.com/shivamsancc/ConfigFoundry).
The project optimizes for running on locked-down, offline, single-team
infrastructure over almost anything else — a PR that trades that away for
convenience (a new dependency, an assumption the internet is reachable)
should expect pushback on the tradeoff, not the code itself. Full guide,
including a few codebase-specific gotchas worth knowing before you dive in:
[docs/contributing.md](docs/contributing.md).

## License

MIT — see [LICENSE](LICENSE).
