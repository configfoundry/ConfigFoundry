# Installation

Three ways to install ConfigFoundry, depending on your environment.
If you just want the fastest path, use [Getting Started](./getting-started.md)
instead — this page covers every method in detail, including the ones
that don't need internet access at all.

## Requirements

| | Minimum | Notes |
|---|---|---|
| Python | 3.10 | 3.12+ recommended |
| Node.js | 18 (optional) | Only needed to rebuild the frontend. A pre-built `frontend/out/` static export ships in the repo/release bundle, so most installs never need Node. |
| Disk | ~200 MB | App + dependencies + offline wheelhouse, before your database grows |
| Database | none required | SQLite ships built into Python; PostgreSQL/MySQL/SQL Server are optional (see [Storage](./storage.md)) |

## Method 1: from source, with internet access

```bash
git clone https://github.com/shivamsancc/ConfigFoundry.git
cd ConfigFoundry
pip install -r requirements.txt
python3 server.py
```

This downloads dependencies from PyPI normally. Use this for local
development or any environment where PyPI access is fine. If you also
want to rebuild the frontend from source instead of using the pre-built
`frontend/out/`:

```bash
cd frontend
npm install
npm run build     # writes frontend/out/, a static export
cd ..
python3 server.py
```

## Method 2: offline / air-gapped install

For environments with zero internet access (see
[Air-Gap Deployment](./airgap.md) for the full explanation of what "zero
internet access" means here and how it's verified):

```bash
./install_offline.sh      # Linux/macOS
# or
.\install_offline.ps1     # Windows PowerShell
```

This script:

1. Verifies Python 3.10+ is present.
2. Creates a `.venv/` virtual environment.
3. Installs every Python dependency from the vendored wheelhouse
   (`vendor/python/`) via `pip install --no-index --find-links`, never
   contacting PyPI.
4. Uses the pre-built `frontend/out/` if present (the common case); if
   you need to rebuild it offline, it uses `vendor/npm/` — see
   [Air-Gap Deployment](./airgap.md) for that path's current state.
5. Prints a success message once everything is verified installed.

Then start it with `./run_offline.sh` (or `run_offline.ps1`), which just
activates `.venv/` and runs `server.py`.

## Method 3: release bundle

Enterprise releases are also published as a single self-contained
archive, `ConfigFoundry-Offline-vX.Y.Z.zip`, that already contains the
wheelhouse, npm vendor artifacts, the pre-built frontend, documentation,
and all installer scripts — nothing to separately clone or download. See
[Release Process](./release-process.md) for what's inside and how it's
built. Unzip it anywhere and run `install_offline.sh` / `.ps1` exactly as
in Method 2.

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
