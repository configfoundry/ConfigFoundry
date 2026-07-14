# Changelog

Parent: [Repository Overview](../../reference/Repository Overview.md) · [Roadmap Overview](../../roadmap/Roadmap Overview.md)

Summary of `CHANGELOG.md` at the repository root — see that file for the authoritative, full-text version. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## Current project state

**v0.5.0 — "Enterprise Preview."** The first broadly documented release. Core platform, security model, and offline deployment path are stable and tested, but this is explicitly **not** a v1.0 commitment — see [Roadmap Overview](../../roadmap/Roadmap Overview.md) for what v1.0 requires. `[Unreleased]` is currently empty — the next entry starts once v0.5.0 is tagged.

## [0.5.0] — Enterprise Preview

### Added

- **Inventory management** — devices, bandwidth caps, subnets: full CRUD, search, sort, pagination, Excel import/export. See [Feature - Inventory Management](../../reference/features/Feature - Inventory Management.md).
- **Dynamic tags** with subnet-based inheritance, and a Network Tree spatial diagram (legacy frontend only — see [Feature - Network Tree](../../reference/features/Feature - Network Tree.md)).
- **Enterprise authentication & RBAC** — Argon2id, JWT + rotating refresh tokens, TOTP MFA, API keys, permission-code authorization, IP-based Access Policy Engine, full audit trail. See [Security Overview](../../security/Security Overview.md).
- **Storage abstraction** — SQLite default; PostgreSQL/MySQL/SQL Server scaffolded behind `StorageProvider`. See [Storage Abstraction](../../architecture/Storage Abstraction.md).
- **Air-gap deployment** — every dependency vendored/pinned, every asset self-hosted, verified in CI against a network-firewalled runner. See [Air-Gap Deployment](../../deployment/Air-Gap Deployment.md).
- **In-app documentation portal** at `/documentation` — search, breadcrumbs, prev/next nav, dark/light theme, Mermaid diagrams, without disturbing Swagger UI (`/docs`) or ReDoc (`/redoc`).
- **Offline release bundles** built automatically by CI, installable with zero internet access.

### Changed

- Split the git repository from the release artifact — repo stays source-only; prebuilt frontend and npm vendor binaries ship only inside release bundles. See [Air-Gap Deployment § Repository vs. release artifact](../../deployment/Air-Gap Deployment.md#repository-vs-release-artifact).
- Repository cleanup: removed committed runtime database/WAL files, fixed a README case-sensitivity issue, removed an orphaned duplicate roadmap file, hardened `.gitignore`.
- `scripts/validate_airgap.py` now also verifies the application can actually be imported and constructed from a fresh `--no-index` install, not just that `pip install` succeeds.
- `scripts/build_release_bundle.sh` now runs full (not `--skip-functional`) air-gap validation against the staged bundle before zipping.
- CI: removed a leftover debugging step; added a repository-hygiene job (40 MB file-size guard).
- `Makefile`: added `install`, `install-backend`, `test`, `typecheck`, `lint` targets.

### Fixed

- `make lint`/`npm run lint` previously hung on an interactive ESLint config prompt — no ESLint config had ever been committed despite being documented as working. Added pinned `eslint`/`eslint-config-next` dev dependencies and a minimal `.eslintrc.json`. Fixed the two real errors this surfaced (unescaped JSX quote characters — text-only fix); three pre-existing `react-hooks/exhaustive-deps` warnings were left as-is deliberately (fixing them could change memoization/render behavior).
- `scripts/build_release_bundle.sh` was staging every release bundle with ~137 stray `__pycache__`/`.pyc` files (written by the air-gap validation step's own import-the-app check, after the existing cleanup step had already run). Added a second cleanup pass right before checksumming/zipping.

### Removed

- Dead code: `core/db.py` and `core/migrations.py` (pre-Alembic `init_db()` and its custom sqlite3 runner — superseded, unreferenced), plus an orphaned duplicate `core/storage.py` (Python's import resolution always preferred the package form, so this file was silently unreachable).
- Several unused imports across the backend, and a genuine pre-existing syntax error in `core/migrations_legacy.py`'s module docstring (never importable, but nothing imported it either).

## See also

[Roadmap Overview](../../roadmap/Roadmap Overview.md) · [Deployment Overview § Release process](../../deployment/Deployment Overview.md#release-process) · Root `CHANGELOG.md` (authoritative source)
