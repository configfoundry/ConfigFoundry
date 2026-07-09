# Code Quality Report

Parent: [[Development/Technical Debt|Technical Debt]] · [[Repository Overview]]

Findings only — no code was modified to produce this report, per the ground rules of this documentation project. Based on directory-structure survey, file inventories, and the project's own self-documented findings (migration reports, module docstrings); not a static-analysis tool run.

## Dead code

| Item | Evidence | Recommendation |
|---|---|---|
| `frontend/src/components/AppShell.tsx`, `components/dashboard/StatCard.tsx`, `components/ui/Badge.tsx`, `layouts/components/{Sidebar,Navbar,UserMenu,Breadcrumbs,Footer}.tsx` | Explicitly identified as dead (zero remaining imports, verified by grep) in `frontend/VUEXY_MIGRATION_REPORT.md`; stubbed with `export {}` because deletion was blocked by a filesystem permission issue in that environment | Delete by hand |
| `frontend/src/components/testfile_delete_me.txt` | Pre-existing debris, name says it all | Delete |
| `core/migrations_legacy.py` | Module docstring self-identifies as "LEGACY," superseded by `core/migrations/runner.py`; `CHANGELOG.md` records that a syntax error in its own docstring went unnoticed because nothing imports it | Confirm zero references, then remove or clearly archive |
| `api/*.py` loose files (sibling to `api/v1/`) | `app.py` only imports and mounts `api/v1/router.py`; these appear to predate the versioning scheme | Confirm zero references, then remove or archive under a clearly marked path |
| `core/repositories/sqlite/` | A second, apparently-older repository implementation exists alongside `core/repositories/sqlalchemy/`, which `docs/storage-architecture.md`'s module layout documents as the live one | Confirm which is actually wired into `ServiceContainer`, retire the other |
| `core/handler.py` | Name suggests a pre-FastAPI HTTP handling layer; not referenced in `docs/development.md`'s project layout table | Confirm whether anything still imports it |

`CHANGELOG.md`'s own `[0.5.0]` entry documents a prior cleanup pass that already removed `core/db.py`, `core/migrations.py` (old name, pre-`core/migrations/` package), and an orphaned `core/storage.py` module — evidence this kind of cleanup is a recognized, recurring need in this codebase, not a one-off.

## Unused files

`theme/` at the repository root contains multiple full framework-variant reference templates (`django-version`, `html-laravel-version`, `html-version`, `nuxt-version`, `react-version`, `vue-laravel-version`, `vue-version`, plus `email-templates`, `changelog.html`, `hire-us.html`) — these appear to be the original Vuexy theme vendor package (multi-framework marketing/demo bundle), not part of the running application. `frontend/src/theme/` and `frontend/src/@core/theme/` are the actual in-use theme code. **Recommendation:** confirm `theme/` at the repo root is reference-only and consider moving it out of the main tree (a `vendor/` or separate reference repo) if it's not needed for day-to-day development — it adds real repository size and search noise for a working session.

## Unused imports

Not assessed — requires a linter run (`ruff`/`flake8`/`pyflakes`), and the project deliberately has no Python linter configured (see [[Development/Engineering Wiki#Coding standards|Engineering Wiki § Coding standards]]). `CHANGELOG.md` records that a previous pass already removed "several unused imports across the backend" as part of the same cleanup that removed the dead files above — worth a recurring, deliberate pass rather than continuous linting, given the project's stated preference against adding a linter dependency.

## Large components / duplicated logic

- **Frontend route duplication** (`inventory/` vs `infrastructure/`, `administration/` vs `admin/`) is the most visible duplication in the codebase — see [[Development/Technical Debt|Technical Debt]].
- **Data Grid column/action patterns** are repeated across Devices/Bandwidth/Subnets/Users/Roles views — `frontend/VUEXY_MIGRATION_REPORT.md` explicitly flags this as a candidate for a shared generic wrapper, deliberately not built yet to avoid speculative abstraction (consistent with [[Architecture Overview#Principles|the project's "explicit over clever" principle]] — this is a case where the team is being disciplined about it, not negligent).
- **`core/diff.py` at 347 lines** is the largest single pure-logic file outside the services/repositories layers — worth a closer read during any future refactor pass to confirm it isn't doing more than one job.

## Refactoring opportunities

1. Consolidate the two repository implementations (`sqlalchemy/` vs `sqlite/`) — see [[Development/Technical Debt|Technical Debt]].
2. Extract a shared Data Grid wrapper once a third or fourth module needing one appears (per the migration report's own recommendation — not before, to avoid premature abstraction).
3. Resolve the frontend route duplication before it accumulates further divergent logic between the "old" and "new" copies of the same page.
4. Add `schemas/inventory.py` (or confirm and document where those schemas currently live) for consistency with `schemas/auth.py`/`schemas/common.py`.

## Performance improvements

- Config generation (`POST /api/v1/generate`) runs synchronously inline with the request — fine at current scale, worth revisiting once there's real production load data (explicitly deferred in [[Roadmap Overview]] to "once there's production usage data to profile against rather than guessing").
- No caching layer exists for read-heavy endpoints (dashboard aggregations, meta statistics) — not necessarily a problem yet, but worth measuring before assuming it needs one.
- Per-operation SQLAlchemy sessions (no connection reuse across calls within a request) is a deliberate, documented tradeoff for statelessness — see [[Backend/Storage Abstraction#Session management|Storage Abstraction § Session management]] — not a bug, but worth knowing if a future profiling pass finds session-open overhead.

## Maintainability concerns

- **Documentation drift risk:** `tests/README.md` stating "no test code exists yet" while 24 test files exist is a concrete, present example of the exact failure mode `docs/contributing.md` itself warns against ("documentation drift is treated as a real defect here"). Worth a project-wide pass to catch any other similarly stale pages.
- **No Python linter** is a deliberate tradeoff (fewer air-gap-relevant pinned dependencies) but does mean style consistency depends entirely on code review discipline — worth periodically confirming this is holding up as the contributor base grows.
- **Two vendor-bundle commit policies** (`vendor/python/` committed, `vendor/npm/` not) is a subtlety that's well-documented but easy for a new contributor to get wrong — see [[Architecture/Decisions/ADR-0003 - Air-Gap-First Architecture|ADR-0003]].

## See also

[[Development/Technical Debt|Technical Debt]] · [[Frontend Documentation/Frontend Overview|Frontend Overview]] · [[Backend/Backend Overview|Backend Overview]]
