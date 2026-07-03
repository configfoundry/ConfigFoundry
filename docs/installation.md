# Installation

Three ways to install ConfigFoundry, depending on your environment.
If you just want the fastest path, use [Getting Started](./getting-started.md)
instead — this page covers every method in detail, including the ones
that don't need internet access at all.

> [!NOTE]
> The git repository and the release bundle are two different things —
> the repository is source only (small, normal `git clone` size); the
> release bundle additionally carries a prebuilt frontend and the full
> offline dependency vendor bundles. See
> [Air-Gap Deployment § Repository vs. release artifact](./airgap.md#repository-vs-release-artifact)
> for exactly what's in each and why.

## Requirements

| | Minimum | Notes |
|---|---|---|
| Python | 3.10 | 3.12+ recommended |
| Node.js | 18 (optional) | Only needed to build the frontend from source. Installing from a release bundle (Method 1) ships a prebuilt `frontend/out/`, so that path never needs Node at all. |
| Disk | ~200 MB | App + dependencies + offline wheelhouse, before your database grows |
| Database | none required | SQLite ships built into Python; PostgreSQL/MySQL/SQL Server are optional (see [Storage](./storage.md)) |

## Method 1: release bundle (recommended for offline / air-gapped)

Download `ConfigFoundry-Offline-vX.Y.Z.zip` from the project's GitHub
Releases page (built automatically by CI — see
[Release Process](./release-process.md)). It's a single self-contained
archive with the wheelhouse, npm vendor artifacts, the prebuilt
frontend, documentation, and every installer script — nothing else to
clone or download, and **no internet access needed on the target
machine at all**.

```bash
unzip ConfigFoundry-Offline-vX.Y.Z.zip
cd ConfigFoundry-Offline-vX.Y.Z
```

::: tabs
@tab Linux / macOS
```bash
./install_offline.sh
./run_offline.sh
```
@tab Windows (PowerShell)
```powershell
.\install_offline.ps1
.\run_offline.ps1
```
:::

Full detail on exactly what the installer does and how "zero internet
access" is verified: [Air-Gap Deployment](./airgap.md).

## Method 2: from source, with internet access

```bash
git clone https://github.com/configfoundry/ConfigFoundry.git
cd ConfigFoundry
pip install -r requirements.txt
```

Build the frontend once (this is the one step that needs Node — a bare
source checkout doesn't ship a prebuilt `frontend/out/`, unlike the
release bundle in Method 1):

```bash
cd frontend
npm install
npm run build     # writes frontend/out/, a static export
cd ..
```

Then run it:

```bash
python3 server.py
```

Use this for local development, contributing, or any environment where
PyPI/npm access is fine.

## Method 3: offline install from a source checkout

If you have a source checkout (Method 2) but want to install the
**Python** side without PyPI access, `vendor/python/` is committed to
the repository specifically to make this possible on its own:

```bash
python3 -m venv .venv
.venv/bin/pip install --no-index --find-links vendor/python -r requirements.txt
```

You'll still need Node and internet access (or a manually-vendored
`vendor/npm/`, see [Air-Gap Deployment](./airgap.md#regenerating-the-offline-bundles))
to build the frontend, since that vendor bundle isn't committed to the
repository. `install_offline.sh` run from a source checkout (rather than
a release bundle) automates exactly this path — see
[Air-Gap Deployment](./airgap.md) for what it does when `frontend/out/`
isn't already present.

## Verifying an install

```bash
python3 scripts/validate_airgap.py --skip-functional   # static checks, fast
python3 scripts/validate_airgap.py                       # + actual --no-index pip install test
python3 -m pytest -q                                      # full backend test suite
```

## Choosing a database

The default is SQLite — zero configuration, one file, fine for small and
mid-sized teams. For larger deployments see [Storage](./storage.md) for
PostgreSQL/MySQL/SQL Server setup, and pass the connection details via
[Configuration](./configuration.md).

## Next steps

- [Getting Started](./getting-started.md) — first login, bootstrap admin, exploring the UI
- [Configuration](./configuration.md) — every environment variable and config file option
- [Air-Gap Deployment](./airgap.md) — the full offline-install story
- [Enterprise Deployment](./enterprise.md) — hardening checklist for production
