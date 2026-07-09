# Technical Debt

Parent: [[Repository Overview]] · [[Development/Code Quality Report|Code Quality Report]]

Consolidated from findings across this vault. No source code was modified to produce this list — findings only, per the ground rules of this documentation project.

| Item | Risk | Priority | Suggested fix | Estimated effort |
|---|---|---|---|---|
| Duplicate frontend route trees (`inventory/` vs `infrastructure/`, `administration/` vs `admin/`, `configuration/*` vs `generate/`/`history/`) | Medium — confusing for maintainers, risk of editing the wrong (dead) copy | High | Confirm which routes are actually linked from `navConfig.tsx`, delete the unlinked duplicates, update any stale internal links | Small–Medium (mostly deletion + verification) |
| 8 dead frontend stub files (`AppShell.tsx`, `dashboard/StatCard.tsx`, `ui/Badge.tsx`, 4 files under `layouts/components/`, `testfile_delete_me.txt`) | Low — harmless but clutters the tree | Medium | Delete by hand (a prior automated pass couldn't due to a filesystem permission restriction in that environment) | Trivial |
| Two parallel backend repository implementations (`core/repositories/sqlalchemy/` and `core/repositories/sqlite/`) | Medium — unclear which is authoritative; risk of divergence | High | Confirm `sqlalchemy/` is the live implementation (per `docs/storage-architecture.md`'s module layout) and retire or clearly archive `sqlite/` | Small (confirmation) → Medium (removal + test migration) |
| Legacy unversioned `api/*.py` files sibling to `api/v1/` | Low functionally (not mounted by `app.py`) but a real security-review distraction — see [[Security/Security Overview#Vulnerabilities & recommendations\|Security Overview]] | Medium | Confirm zero import references, then delete or move under a clearly marked `legacy/` path | Small |
| `core/handler.py` and `core/migrations_legacy.py` | Low — reference-only, but ambiguous to a new contributor | Low | Confirm unreferenced, add a top-of-file "not used, kept for reference" banner (partially already present on the migrations file) or remove | Trivial |
| `core/aesgcm.py` hand-rolled crypto present in the security-adjacent namespace | Low today (unused for anything sensitive — MFA/secret encryption uses the audited `cryptography` package instead) but a latent risk if a future contributor reaches for it by name-similarity | Medium | Rename out of `core/security/`-adjacent naming or add a runtime guard/prominent docstring warning (a docstring warning already exists — confirm it's sufficiently prominent) | Trivial |
| `tests/README.md` says "no test code exists yet" | Low — pure documentation drift, but undermines trust in the rest of the docs set | Low | Update to reflect the current 24-file suite (see [[Testing/Testing Strategy\|Testing Strategy]]) | Trivial |
| No `schemas/inventory.py` (devices/bandwidth/subnets/tags/lists schemas not colocated with `schemas/auth.py`/`schemas/common.py`) | Low — organizational only | Low | Verify where these schemas actually live and consolidate under `schemas/` for consistency | Small |
| PostgreSQL/MySQL/SQL Server storage providers are scaffolds only | Medium — a deployer configuring `provider: postgresql` gets `NotImplementedError`, not a working database | High (blocks any non-SQLite production deployment) | Implement `initialize()`/`get_engine()`/`get_session_factory()` for at least PostgreSQL first (highest-demand alternative) | Large |
| No async support (`AsyncStorageProvider`) | Low today, rising to Medium at higher request concurrency | Low (until concurrency becomes a real bottleneck) | Add an async-capable provider variant once there's production load data to justify it | Large |
| Per-process rate limiting and no shared cache layer | Medium at multi-instance scale | Medium (blocks HA roadmap item) | Redis-backed rate limiter behind the existing interface — planned v0.8.x | Medium |
| No `/health`/`/ready`/`/metrics` endpoints | Low — workable substitutes exist (`/openapi.json`, `/api/v1/meta`) | Medium | Implement per the v0.6.0 roadmap item, exposing the already-built `StorageProvider.health_check()` | Small–Medium |
| No Dockerfile / container image | Low — bare-metal/systemd deployment is fully documented and functional | Low (unless containerized deployment becomes a stated requirement) | Author a minimal Dockerfile if container deployment is desired | Small |
| Multi-tenant inventory scoping absent (security layer is org-scoped, inventory tables are not) | Medium for any deployment needing hard multi-tenant inventory isolation today | High (largest single migration on the roadmap) | Retrofit `org_id` onto `devices`/`bandwidth_caps`/`subnets`/`tag_defs`/`lists`/`yaml_history` — touches every existing inventory service | Large |
| `@mui/x-tree-view` pinned to the older `TreeView`/`nodeId` API | Low today | Low | Budget `PermissionTree.tsx` rework when eventually upgrading this dependency | Small |
| No frontend automated test suite | Medium — regressions caught only by `tsc`/`next lint`, not behavior tests | Medium | Introduce a thin smoke-test layer (React Testing Library or Playwright) | Medium |
| Time-based Access Policy windows scaffolded but unenforced | Low — clearly documented as not-yet-enforced, not silently missing | Medium | Implement `PolicyEngine.evaluate_time_window()` enforcement — planned v0.7.0 | Medium |
| Audit log has no retention/purge/export tooling | Low today, grows over time | Medium | Retention policy + export tooling — planned v0.7.0 | Medium |

## Notes on methodology

This list synthesizes: explicit "Technical debt remaining" / "Suggested improvements" sections already written into `frontend/VUEXY_MIGRATION_REPORT.md` and `docs/storage-architecture.md`; explicit "Known limitation" / "Known scope boundary" callouts across `docs/*.md`; and direct observations made while surveying the repository structure for this documentation pass (route duplication, stale `tests/README.md`, presence of two repository implementations). Nothing here required reading every line of every file — deeper static analysis (dead code detection, cyclomatic complexity, duplicate-logic detection) is out of scope for a documentation pass and would benefit from dedicated tooling; see [[Development/Code Quality Report|Code Quality Report]] for what could be assessed without that tooling.

## See also

[[Development/Code Quality Report|Code Quality Report]] · [[Roadmap Overview]] · [[Executive Summary]]
