# Backend Overview

Parent: [[Repository Overview]] · [[Architecture Overview]]

The backend is a single FastAPI process. This page documents every backend-related top-level folder (`core/`, `api/`, `models/`, `schemas/`, `formats/`, `tools/`) in one place — purpose, files, dependencies, entry points, relationships, and improvement opportunities — rather than one micro-page per folder, since they form one cohesive layer.

## `core/` — services, repositories, security, storage, logging

**Purpose:** owns the inventory domain model and all business logic. Nothing in `core/` imports from `api/`, `frontend/`, or `integrations/` — see [[Architecture Overview#Principles]].

| Subpackage | Responsibility | Key files |
|---|---|---|
| `core/services/` | Business logic, one service per aggregate/concern. No direct DB access — calls repositories. | `device_service.py`, `bandwidth_service.py`, `subnet_service.py`, `tag_service.py`, `list_service.py`, `generate_service.py`, `history_service.py`, `export_service.py`, `import_service.py`, `meta_service.py`, `audit_service.py`, `auth_service.py`, `mfa_service.py`, `api_key_service.py`, `user_service.py`, `role_service.py`, `rbac_service.py`, `organization_service.py`, `policy_engine.py`, `policy_service.py` |
| `core/repositories/` | Persistence only, no business logic. `interfaces.py` defines the ABCs; `sqlalchemy/` is the concrete (production) implementation; `sqlite/` is an older, narrower implementation. | `interfaces.py`, `sqlalchemy/*.py` (13 repos), `sqlite/*.py` (7 repos) |
| `core/security/` | Auth primitives: password hashing, JWT, MFA, rate limiting, IP resolution, permission catalog, crypto, middleware. | `password.py`, `jwt_tokens.py`, `mfa.py`, `tokens.py`, `crypto.py`, `ip.py`, `permissions.py`, `rate_limit.py`, `middleware.py`, `config.py` |
| `core/storage/` | `StorageProvider` abstraction — decouples the app from any specific DB driver. | `provider.py`, `factory.py`, `config.py`, `providers/{sqlite,postgresql,mysql,sqlserver}.py` |
| `core/logging/` | Structured logging framework — see [[Backend/Logging Framework\|Logging Framework]]. | `config.py`, `context.py`, `factory.py`, `formatters.py`, `handlers.py`, `middleware.py`, `startup.py` |
| `core/migrations/` | Programmatic Alembic runner, called at startup. | `runner.py` |
| `core/container.py` | `ServiceContainer` — the single dependency-injection root; wires every repository and service. | — |
| `core/logic.py`, `core/diff.py`, `core/validator.py` | Pure business logic: collector-config conversion, generation diffing, field validation. | — |
| `core/aesgcm.py` | Hand-rolled AES-GCM. **Explicitly documented in its own module docstring as unsuitable for anything security-critical** — MFA/secret encryption deliberately uses the audited `cryptography` package (`core/security/crypto.py`) instead. See [[Security/Security Overview\|Security Overview]]. |
| `core/migrations_legacy.py` | Reference-only: the pre-Alembic custom sqlite3 migration system. Not imported by anything live. |
| `core/handler.py` | Legacy HTTP handler code predating the FastAPI/`api/v1` layer — see [[Development/Technical Debt\|Technical Debt]] for whether this is still reachable. |

**Entry points:** `core/container.py::ServiceContainer.__init__` (called from `app.py::create_app()`); every `get_logger(__name__)` call in `core/logging/factory.py`.

**Dependencies:** SQLAlchemy 2.x, Alembic, `argon2-cffi`, `pyjwt`, `pyotp`, `cryptography` — all pinned in `requirements.txt`. No `api/`, `frontend/`, or `integrations/` imports (enforced by convention, not tooling — see [[Development/Technical Debt|Technical Debt]] for the lack of an import-linter).

**Relationships:** `api/v1/*` depends on `core/services/*`; `core/services/*` depends on `core/repositories/interfaces.py`; `core/repositories/sqlalchemy/*` depends on `core/storage/provider.py` and `models/*`.

**Potential improvements:** two parallel repository implementations exist (`sqlalchemy/` and `sqlite/`) — confirm which is live and retire the other (see [[Development/Code Quality Report|Code Quality Report]]). No async support yet (`AsyncStorageProvider` is a documented future milestone in `docs/storage-architecture.md`).

## `api/` and `api/v1/` — HTTP layer

**Purpose:** translates HTTP requests into service calls; owns no business logic. See [[API Documentation/API Overview|API Overview]] for the full endpoint catalog.

| Location | Status |
|---|---|
| `api/v1/` | Live. `router.py` assembles 15 sub-routers (`auth`, `users`, `roles`, `api_keys`, `policies`, `devices`, `bandwidth`, `subnets`, `tags`, `lists`, `generate`, `history`, `export`, `audit`, `meta`). Mounted in `app.py` at `/api`. |
| `api/dependencies.py` | Shared across all versions: `get_container()`, `get_current_principal()`, `require_permission()`. |
| `api/*.py` (loose, sibling to `v1/`) | Pre-versioning legacy files with the same resource names (`devices.py`, `audit.py`, `bandwidth.py`, `export.py`, `generate.py`, `history.py`, `lists.py`, `meta.py`, `subnets.py`, `tags.py`). **Not imported by `app.py`** — see [[Development/Technical Debt|Technical Debt]] for the recommendation to delete or clearly archive these. |

**Entry points:** `api/v1/router.py::router` (included by `app.py`).

**Relationships:** depends on `core/services/*` and `schemas/*`; adding `/api/v2/` means a new `api/v2/` package reusing unchanged `api/v1/` modules — see [[API Documentation/API Versioning|API Versioning]].

## `models/` — SQLAlchemy ORM models

**Purpose:** schema definitions only; no business logic.

| File | Contents |
|---|---|
| `models/base.py` | Declarative `Base` |
| `models/inventory.py` | `DeviceModel`, `BandwidthCapModel`, `SubnetModel`, `TagDefModel` (JSON-blob entity tables: `id` / `data` / `updated_at`), `AuditLogModel`, `YamlHistoryModel`, `ListModel`, `MetaModel` |
| `models/auth.py` | `OrganizationModel`, `UserModel`, `RoleModel`, `PermissionModel`, `RolePermissionModel`, `UserRoleModel`, `RefreshTokenModel`, `APIKeyModel`, `NetworkACLModel`, `MFABackupCodeModel` — fully normalized relational tables |

Full field-level reference: [[Database Overview]].

## `schemas/` — Pydantic request/response models

| File | Contents |
|---|---|
| `schemas/auth.py` | Login/token/user/role/API-key/policy request and response shapes |
| `schemas/common.py` | Shared shapes (pagination envelopes, error shapes, etc.) |

**Relationships:** consumed by `api/v1/*` route signatures for automatic validation and OpenAPI generation.

**Potential improvement:** there is no `schemas/inventory.py` — the device/bandwidth/subnet/tag/list request-response shapes appear to be defined inline or elsewhere; worth consolidating alongside `schemas/auth.py` and `schemas/common.py` for consistency. Verify during a future pass — flagged in [[Development/Code Quality Report|Code Quality Report]].

## `formats/` — pure-Python serialization

| File | Purpose |
|---|---|
| `formats/yamldump.py` | Hand-rolled YAML serializer (no PyYAML dependency at runtime) for collector config output |
| `formats/xlsxwriter.py` | Excel (.xlsx) writer for export endpoints |

**Why hand-rolled:** consistent with the "zero required backend dependencies beyond what's vendored" architecture principle — see [[Architecture Overview#Principles]].

## `tools/` — developer utilities

| File | Purpose |
|---|---|
| `tools/debug.py` | Ad hoc developer debugging script — not part of the running application |

## See also

[[API Documentation/API Overview|API Overview]] · [[Database Overview]] · [[Security/Security Overview|Security Overview]] · [[Backend/Logging Framework|Logging Framework]] · [[Backend/Storage Abstraction|Storage Abstraction]]
