# Changelog

All notable changes to ConfigFoundry are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
versioning follows [Semantic Versioning](https://semver.org/) — see
[Roadmap](docs/roadmap.md) for the versioning strategy and what's
planned toward v1.0.

## [Unreleased]

### Removed
- Dead code: `core/db.py` and `core/migrations.py` (the pre-Alembic
  `init_db()` entry point and its custom sqlite3 migration runner —
  superseded by `core/migrations/runner.py`, unreferenced by anything
  else). `core/storage.py`, an orphaned duplicate of the storage
  compatibility shim that actually lives in `core/storage/__init__.py`
  — Python's import resolution always preferred the package over this
  identically-named module, so it was silently unreachable.
- Several unused imports across the backend, and a genuine pre-existing
  syntax error in `core/migrations_legacy.py`'s module docstring (the
  file was never importable, but nothing imported it either — see
  the "LEGACY migration system" note at the top of that file).

### Changed
- Repository cleanup: removed committed runtime database/WAL files,
  fixed a `README.md` case-sensitivity issue, removed an orphaned
  duplicate roadmap file, hardened `.gitignore` against common
  Python/Node build caches.
- `scripts/validate_airgap.py` now also verifies the application can
  actually be imported and constructed from a fresh `--no-index`
  install (`check_import_validation`), not just that `pip install`
  succeeds — catches a missing runtime dependency before it ships.
- `scripts/build_release_bundle.sh` now runs the full (not
  `--skip-functional`) air-gap validation against the staged bundle
  before zipping, so a release bundle missing a required package is
  never produced.
- CI: removed a leftover temporary debugging step from the offline
  smoke-test job; added a repository-hygiene job that fails a build if
  any tracked file exceeds 40 MB.
- `Makefile`: added `install`, `install-backend`, `test`, `typecheck`,
  and `lint` targets so common developer commands don't need to be
  remembered by hand.

## [0.5.0] - Enterprise Preview

The first broadly documented release. Treat this as an **Enterprise
Preview** — the core platform, security model, and offline deployment
path are stable and tested, but this is not yet a v1.0 commitment (see
[Roadmap](docs/roadmap.md) for what v1.0 requires).

### Added
- **Inventory management** — devices, bandwidth caps, and subnets with
  full CRUD, search, sort, pagination, and Excel import/export.
- **Dynamic tags** with subnet-based inheritance, and a Network Tree
  spatial diagram (currently only in the legacy frontend — see
  [Features § Network Tree](docs/features.md#network-tree)).
- **Enterprise authentication & RBAC** — Argon2id password hashing, JWT
  access tokens with rotating refresh tokens, TOTP MFA, API keys,
  permission-code authorization, an IP-based Access Policy Engine, and
  a full audit trail.
- **Storage abstraction** — SQLite by default; PostgreSQL/MySQL/SQL
  Server scaffolded behind the same `StorageProvider` interface.
- **Air-gap deployment** — every dependency vendored and pinned, every
  static asset self-hosted, verified automatically in CI against a
  network-firewalled runner.
- **Enterprise documentation portal** at `/documentation` — search,
  breadcrumbs, prev/next navigation, dark/light theme, Mermaid
  diagrams, callouts, tabs, and a table of contents, without disturbing
  FastAPI's own Swagger UI (`/docs`) or ReDoc (`/redoc`).
- **Offline release bundles** (`ConfigFoundry-Offline-vX.Y.Z.zip`) built
  automatically by CI, containing a prebuilt frontend, a full Python +
  npm offline vendor bundle, every installer script, and checksums —
  installable with zero internet access.

### Changed
- Split the git repository from the release artifact: the repository
  stays source-only and lightweight; the prebuilt frontend and npm
  vendor binaries now ship only inside the release bundle. See
  [Air-Gap Deployment § Repository vs. release artifact](docs/airgap.md#repository-vs-release-artifact).

[Unreleased]: https://github.com/shivamsancc/ConfigFoundry/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/shivamsancc/ConfigFoundry/releases/tag/v0.5.0
