# Development Setup

Parent: [[Deployment/Deployment Overview|Deployment Overview]] · [[Development/Engineering Wiki|Engineering Wiki]]

## Prerequisites

- Python 3.10+ (3.12+ recommended)
- Node.js 18+ (only to build the Next.js frontend from source)

## Setup

```bash
git clone https://github.com/configfoundry/ConfigFoundry.git
cd ConfigFoundry
python3 -m venv .venv && source .venv/bin/activate
make install   # pip install (backend + dev deps) + npm install (frontend)
```

`make install-backend` / `make install-frontend` run either step alone.

## Running locally

```bash
make dev            # backend :8420 + Next.js dev server :3001, both live-reloading
make dev-backend    # FastAPI only (DD_SERVICE=configfoundry-api ddtrace-run python3 server.py)
make dev-frontend   # Next.js dev server only
```

For a production-shaped single-port test:

```bash
make build           # builds frontend/out/
make serve            # build + start FastAPI serving both API and frontend on :8420
```

A bare clone has no `frontend/out/` (generated, not committed) — running `python3 server.py` directly still works, falling back to the legacy `static/` UI. See [[Frontend Documentation/Frontend Overview|Frontend Overview]].

## Tests

```bash
make test                              # full suite, same as CI
python -m pytest -q
python -m pytest tests/security -q     # one area
python -m pytest -k test_login -q      # by name
make typecheck    # tsc --noEmit
make lint         # next lint
```

See [[Testing/Testing Strategy|Testing Strategy]].

## Making a schema change

See [[Database Overview#Migration strategy]] — edit the model, `alembic revision --autogenerate`, review the generated file, test upgrade and downgrade.

## Adding a new API endpoint

1. Add the route to `api/v1/` (or a new file, registered in `api/v1/router.py`).
2. Depend on `require_permission("resource:action")` — add a new permission code to `core/security/permissions.py` first if none fit.
3. Put logic in a service (`core/services/`), never the route handler.
4. Add tests.
5. Note the change for the next release's [[Development/Changelog|Changelog]].

## Keeping the air-gap bundle in sync

If a Python or npm dependency changes:

```bash
./scripts/build_python_wheelhouse.sh
./scripts/build_npm_offline_vendor.sh    # only if frontend deps changed
python3 scripts/validate_airgap.py
```

## Code style

Explicit over clever (see [[Architecture Overview#Principles]]). No hardcoded role-name checks — permission codes only. No new external CDN/network dependency in application source (`validate_airgap.py` catches it). No Python linter/formatter is wired in — deliberate: one fewer pinned dependency to keep air-gap-clean, style enforced in review instead. See [[Development/Engineering Wiki|Engineering Wiki]] for the full standards.

## See also

[[Development/Engineering Wiki|Engineering Wiki]] · [[Testing/Testing Strategy|Testing Strategy]] · [[Deployment/Deployment Overview|Deployment Overview]]
