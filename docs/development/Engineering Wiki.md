# Engineering Wiki

Parent: [Repository Overview](../reference/Repository Overview.md) · [Development Setup](../deployment/Development Setup.md)

## Architecture principles

See [Architecture Overview](../architecture/Architecture Overview.md#principles) — core owns the inventory model; integrations are optional and never imported by core; zero required backend dependencies beyond what's vendored; SQLite is the default, others opt-in; everything must work offline; explicit code over clever abstractions; simplicity as a feature (smaller surface area, easier to audit).

## Coding standards

- **Explicit over clever.** No hardcoded role-name checks — routes depend on permission codes via `require_permission("resource:action")`, never a role name string. See [Authorization & RBAC](../security/Authorization & RBAC.md).
- **Layering is enforced by convention:** repositories never contain business logic; services never import a database driver directly; routes never contain business logic. See [Architecture Overview](../architecture/Architecture Overview.md#backend-architecture).
- **No new external CDN/network dependency** in application source — `scripts/validate_airgap.py` catches it in CI, but know the rule going in.
- **No Python linter/formatter is configured** — deliberate: one fewer pinned dependency to keep air-gap-clean; the codebase is small enough that style is enforced in review. `requirements-dev.txt` stays pytest-only for the same reason.
- **Frontend:** `next lint` (ESLint, `next/core-web-vitals` config) and `tsc --noEmit` are the enforced gates (`make lint`, `make typecheck`).

## Naming conventions

- Permission codes: `<resource>:<action>` (e.g. `inventory:write`, `user:manage`) — see [RBAC Permission Catalog](../security/RBAC Permission Catalog.md).
- Environment variables: `CONFIGFOUNDRY_<AREA>_<NAME>` (`CONFIGFOUNDRY_AUTH_*`, `CONFIGFOUNDRY_DB_*`, `CONFIGFOUNDRY_LOG_*`) — Datadog variables are the one exception, using the standard `DD_*` convention instead, for interoperability with Datadog tooling.
- Loggers: always `get_logger(__name__)` from `core.logging` — never `logging.getLogger()` directly — so every logger lands under the `configfoundry.*` namespace. See [Logging Framework](../architecture/Logging Framework.md).
- Services/repositories: one file per aggregate (`device_service.py` / `SQLAlchemyDeviceRepository` in `device.py`), mirrored between `core/services/` and `core/repositories/sqlalchemy/`.

## Branch strategy

Single `main` branch per the CI workflow trigger configuration (`.github/workflows/ci.yml` triggers on push to `main` and on `v*` tags, plus PRs targeting `main`) — a straightforward trunk-based / feature-branch-into-main model. No `develop`/release-branch structure is evident in the repository.

## Commit strategy

Not formally documented in the repository (no `COMMIT_CONVENTION.md` or enforced commit-lint). `CONTRIBUTING.md`'s one hard rule that shapes every review: **never remove an existing feature or reduce functionality** to make something else cleaner. Migration files must be committed alongside the model change that requires them, in the same PR — see [Database Overview](../architecture/Database Overview.md#migration-strategy).

## Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`); `frontend/package.json`'s `version` field is the single source of truth. Pre-1.0, minor bumps may include internal breaking changes, but the public REST API is additionally protected by URL versioning (`/api/v1/`) — see [API Versioning](../api/API Versioning.md) — so API consumers are insulated from internal churn even pre-1.0.

## Review process

Not formally documented as a required-reviewers policy in the repository, but `CONTRIBUTING.md` states the review priority explicitly: keeping `docs/` in sync with a change is treated as a real defect if missing, not an afterthought; a PR that trades away the offline/locked-down-network posture for convenience (a new dependency, an internet-reachability assumption) should expect pushback on the tradeoff itself. CI is the enforced gate: repo hygiene, backend tests, frontend typecheck/lint, air-gap validation, and the offline-install smoke test must all pass before merge.

## Documentation standards

- Every `docs/*.md` page cross-links related pages rather than duplicating content — the same principle this Obsidian vault follows via Obsidian's double-bracket wiki-link syntax.
- Mermaid diagrams for anything architectural — rendered natively by GitHub and by the in-app documentation viewer's self-hosted Mermaid bundle (no CDN).
- Documentation drift is treated as a defect: `docs/release-process.md`'s pre-release checklist explicitly includes "review `docs/` for anything the release changed."

## Adding a new API endpoint

See [Development Setup § Adding a new API endpoint](../deployment/Development Setup.md#adding-a-new-api-endpoint).

## Adding a new storage provider

See [Storage Abstraction § Adding a new provider](../architecture/Storage Abstraction.md#adding-a-new-provider).

## Adding a new integration

See [Integrations Overview](../integrations/Integrations Overview.md) for the full architectural contract (optional, core never imports it, guard third-party imports, never crash the server).

## See also

[Development Setup](../deployment/Development Setup.md) · [Testing Strategy](Testing Strategy.md) · [ADR Index](../adr/ADR Index.md)
