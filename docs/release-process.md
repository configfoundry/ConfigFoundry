# Release Process

## Versioning

ConfigFoundry uses `MAJOR.MINOR.PATCH` (semantic versioning). The
version lives in `frontend/package.json`'s `version` field, treated as
the single source of truth. Pre-1.0 (current state), minor version bumps
may include breaking changes to internals that aren't part of the public
API/config contract; the public REST API itself is additionally
protected by URL versioning (`/api/v1/`, see
[API Versioning](./api-versioning.md)), so API consumers are insulated
from internal churn even pre-1.0.

## What triggers a release

A release is cut when a meaningful, coherent set of changes has landed
on `main` and passed CI — there's no fixed cadence. See
[Roadmap](./roadmap.md) for what's likely to drive the next one.

## Pre-release checklist

1. Full CI suite green on `main`: backend tests, frontend typecheck,
   air-gap validation, offline-install smoke test, docs build (see
   `.github/workflows/ci.yml`).
2. `python3 scripts/validate_airgap.py` passes with no `--skip-functional`.
3. `python -m pytest -q` passes locally as a final sanity check.
4. Version bumped in `frontend/package.json`.
5. Offline vendor bundles regenerated if any dependency changed since
   the last release:
   ```bash
   ./scripts/build_python_wheelhouse.sh --with-dev
   ./scripts/build_npm_offline_vendor.sh
   ```
6. `docs/` reviewed for anything the release changed — no page should
   describe behavior that no longer matches the code (see
   [Contributing § What gets prioritized in review](./contributing.md#what-gets-prioritized-in-review)).

## Building the release bundle

```bash
./scripts/build_release_bundle.sh
```

Produces `ConfigFoundry-Offline-vX.Y.Z.zip` in the repository root,
containing everything a target machine needs with zero internet access:

```
ConfigFoundry-Offline-vX.Y.Z/
  (application source: app.py, core/, api/, models/, alembic/, static/, ...)
  frontend/out/              pre-built static frontend export
  vendor/python/              pinned wheel bundle + CHECKSUMS.sha256
  vendor/npm/                 npm offline artifacts (see docs/airgap.md for current coverage)
  docs/                        this documentation set
  install_offline.sh / .ps1
  run_offline.sh / .ps1
  upgrade_offline.sh / .ps1
  scripts/validate_airgap.py
  LICENSE
  VERSION                      plain-text version string
  CHECKSUMS.sha256             checksums of every file in the archive itself
```

The script builds the frontend fresh, runs `validate_airgap.py` against
the assembled contents before zipping (a release that would fail air-gap
validation never gets published), and writes a top-level
`CHECKSUMS.sha256` so the archive's own integrity can be verified after
transfer to an air-gapped machine — a common requirement for moving
software across a physical air gap (e.g. via approved removable media)
in regulated environments.

## Publishing

Attach `ConfigFoundry-Offline-vX.Y.Z.zip` (and its standalone
`.sha256` checksum file) to the GitHub release for that tag, alongside
release notes summarizing what changed. Tag `main` at the exact commit
the bundle was built from.

## Verifying a release before trusting it

```bash
sha256sum -c ConfigFoundry-Offline-vX.Y.Z.zip.sha256
unzip ConfigFoundry-Offline-vX.Y.Z.zip
cd ConfigFoundry-Offline-vX.Y.Z
python3 scripts/validate_airgap.py
```

## See also

- [Upgrade Guide](./upgrade.md) — applying a release to an existing install.
- [Air-Gap Deployment](./airgap.md) — the offline guarantees a release bundle upholds.
- [Installation](./installation.md) — installing from a release bundle for the first time.
