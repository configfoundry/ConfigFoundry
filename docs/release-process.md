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
5. `CHANGELOG.md` has a `## [X.Y.Z]` section for the version being
   released — CI extracts this section automatically for the GitHub
   Release body (see Publishing below); if it's missing, the release
   still publishes but with a generic fallback note instead of real
   release notes.
6. Offline vendor bundles regenerated if any dependency changed since
   the last release:
   ```bash
   ./scripts/build_python_wheelhouse.sh --with-dev
   ./scripts/build_npm_offline_vendor.sh
   ```
7. `docs/` reviewed for anything the release changed — no page should
   describe behavior that no longer matches the code (see
   [Contributing § What gets prioritized in review](./contributing.md#what-gets-prioritized-in-review)).

## Building the release bundle

> [!NOTE]
> This is the one step that turns the lightweight, source-only git
> repository into the fully self-contained offline artifact — see
> [Air-Gap Deployment § Repository vs. release artifact](./airgap.md#repository-vs-release-artifact)
> for what's committed to git versus what only exists inside the zip.

```bash
./scripts/build_release_bundle.sh
```

If `vendor/python/` or `vendor/npm/` aren't already present, the script
regenerates them automatically (needs internet access for that step
only — see [Air-Gap Deployment § Regenerating the offline bundles](./airgap.md#regenerating-the-offline-bundles)).

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

The script builds the frontend fresh, then runs the **full**
`validate_airgap.py` (not `--skip-functional`) against the assembled
contents before zipping — including installing into a throwaway
virtualenv with `--no-index` and then actually importing and
constructing the application from it. A release that would fail
air-gap validation, or whose bundle is missing a runtime package
`requirements.txt` doesn't actually pin, never gets zipped. Finally it
writes a top-level `CHECKSUMS.sha256` so the archive's own integrity
can be verified after transfer to an air-gapped machine — a common
requirement for moving software across a physical air gap (e.g. via
approved removable media) in regulated environments.

## Publishing

Pushing a `vX.Y.Z` tag on `main` is the only manual step — CI's
`build-release-bundle` job does the rest: it builds the bundle, extracts
the matching `## [X.Y.Z]` section from `CHANGELOG.md` as the release
body, and attaches `ConfigFoundry-Offline-vX.Y.Z.zip` plus its
`.sha256` checksum to the GitHub release for that tag. Tag `main` at
the exact commit the bundle should be built from:

```bash
git tag v0.5.0
git push origin v0.5.0
```

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
