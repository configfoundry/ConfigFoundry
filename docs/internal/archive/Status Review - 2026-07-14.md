# ConfigFoundry — Project Status Review
*Compiled 2026-07-14 from the project's documentation vault and source code. Current release: v0.5.0 "Enterprise Preview."*

---

## 1. Project Overview

**Problem it solves.** Network teams typically track device inventory in a spreadsheet and hand-roll monitoring collector config from it. That breaks down at team scale: multiple people editing their own copy, no validation, no audit trail, and generated config that silently drifts from the spreadsheet. ConfigFoundry replaces the spreadsheet with one shared, self-hosted web server the whole team points a browser at — a single dataset, input validation, an audit log of who changed what, and YAML generation that's always derived from current data instead of copy-pasted by hand.

**Product vision** (from `Product/Product Vision.md`): *"A shared, self-hosted source of truth for network device inventory that generates monitoring collector configuration on demand — built so it can run anywhere, including networks with zero internet access, and secure enough for regulated environments to trust it with production access control."*

Five product pillars: single source of truth (one dataset, multi-user, always current); config generation, not config storage (YAML always derived from live inventory, never hand-edited); enterprise-grade security by default, not bolted on later; air-gap-first, verified in CI rather than an afterthought; explicit over clever — a smaller, auditable surface area.

Deliberate non-goals: not a CMDB (no asset lifecycle/ownership/warranty tracking), not SaaS/hosted (self-hosted only), not a plugin marketplace (every integration reviewed and in-repo).

**Current scope.** The MVP is already shipped as of v0.5.0: full inventory CRUD, dynamic tagging with subnet-based inheritance, YAML generation with history, enterprise auth (Argon2id/JWT/MFA/API keys), permission-code RBAC (5 system roles + custom), IP-based Access Policy Engine, full audit trail, SQLite storage, verified air-gap deployment, and an in-app documentation portal.

Explicitly **not** in current scope: the Network Tree diagram in the current Next.js frontend (only in the legacy static frontend); SSO/OIDC/LDAP; multi-tenant inventory isolation (the security layer is multi-tenant, inventory tables are not); production-validated non-SQLite storage (PostgreSQL/MySQL/SQL Server are interface scaffolds only); `/health`/`/metrics` endpoints.

---

## 2. Architecture

**System architecture.** Browser (Next.js static export) → FastAPI app (`app.py`) → middleware chain (SecurityHeaders → TrustedProxy → AccessPolicy → RateLimit → CORS → CorrelationID → RequestLogging) → versioned routes (`api/v1/*`) → `get_current_principal()` → `require_permission()` → business services (`core/services/`) → repository layer (SQLAlchemy, one per aggregate) → `StorageProvider` abstraction → SQLite (fully implemented) or PostgreSQL/MySQL/SQL Server (scaffolded only, raise `NotImplementedError`).

There is no background job queue and no caching layer — a single synchronous-per-request FastAPI process; config generation runs inline on the request thread. Rate limiting is the one in-memory, per-process structure.

**Major modules:** `app.py`/`server.py` (app factory / CLI entry), `api/` + `api/v1/` (REST routers), `core/` (services, repositories, security, storage, logging, migrations), `models/` (SQLAlchemy ORM), `schemas/` (Pydantic request/response models), `alembic/` (migrations), `frontend/` (Next.js source + static export), `static/` (legacy vanilla-JS frontend, predates the auth layer), `integrations/` (contract/placeholder for future external integrations, no implementation yet), `formats/` (dependency-free YAML/XLSX serialization), `tests/` (24 backend test files), `scripts/` (wheelhouse/npm vendor builders, air-gap validator, release bundler), `vendor/` (committed Python wheelhouse + uncommitted npm offline artifacts).

**Stated architecture principles** (from `Architecture Overview.md`): core owns the inventory model; integrations are optional; core never imports integrations; zero required backend dependencies beyond what's vendored; SQLite is the default, other databases are opt-in and never required; everything must work offline; explicit code is preferred over clever abstractions; simplicity is a feature.

**Design decisions (ADRs, all "Accepted, implemented").** Note: these are reconstructed-from-codebase rationale documents, not the output of a formal ADR process during development.

- **ADR-0001 — SQLite default behind a `StorageProvider` abstraction.** Zero-dependency default; Postgres/MySQL/SQL Server are interface-compliant scaffolds. Tradeoff: SQLite's single-writer ceiling, and an expectation gap for anyone who configures a scaffolded provider expecting it to work.
- **ADR-0002 — Permission-code RBAC, never role-name checks.** Every protected route uses `require_permission("<resource>:<action>")`; the permission catalog and system roles are data-driven via a `role_permissions` table.
- **ADR-0003 — Air-gap-first architecture.** Every dependency vendored/pinned at release-build time, every static asset self-hosted (including Swagger/ReDoc), proven by `scripts/validate_airgap.py` plus a CI job that firewalls a runner off from the internet with iptables.
- **ADR-0004 — Alembic-based migrations**, replacing an earlier custom sqlite3 migration system (kept only as reference in `core/migrations_legacy.py`). Uses `op.batch_alter_table()` for SQLite's lack of direct `ALTER TABLE`.
- **ADR-0005 — Next.js static export served same-origin by FastAPI.** No SSR/Node server at runtime; avoids a second process and CORS; enables a same-origin-only CSP. Tradeoff: no SSR/ISR/API routes, and one CSP relaxation (`'unsafe-inline'` on `script-src`) for Next.js's hydration payload.
- **ADR-0006 — URL-based, router-per-version API versioning** (`/api/v1/...`) over header-based versioning. Bookmarkable, curlable, log-visible, testable. Tradeoff: the static-files mount must be registered after all routers, and the middleware stack is shared across versions.
- **ADR-0007 — `perm_version` stamp instead of a token blacklist.** Every user carries an integer embedded in access tokens; role change, forced logout, password change, or deactivation increments it, immediately invalidating all of that user's previously issued tokens. Coarse (revokes everything, not one token) — refresh-token reuse detection separately handles the "single stolen token" case.

**Technology stack.**

- Backend: Python 3.10+, FastAPI 0.139, SQLAlchemy 2.x, Alembic, Pydantic v2, uvicorn, Argon2id (`argon2-cffi`), PyJWT, PyOTP (TOTP/MFA), `cryptography` (AES-256-GCM for secrets at rest), `ddtrace` (Datadog APM instrumentation).
- Frontend: Next.js 14 (App Router, static export), React 18, MUI 5 (Vuexy theme), TanStack React Query, ApexCharts, TypeScript 5.9, `xlsx`.
- Database: SQLite by default; PostgreSQL/MySQL/SQL Server scaffolded behind `StorageProvider`.
- Legacy frontend: vanilla JS (`static/`), predates the auth layer.

---

## 3. Backend

**Folder structure and package organization** (layered: `api/v1/*` → `core/services/*` → `core/repositories/interfaces.py` → `core/repositories/sqlalchemy/*` → `core/storage/provider.py` → `models/*`; `core/` never imports `api/`, `frontend/`, or `integrations/`, convention-enforced with no linter tooling behind it):

- `core/services/` — 18–24 service files (device, bandwidth, subnet, tag, list, generate, history, export, import, meta, audit, auth, mfa, api_key, user, role, rbac, organization, policy_engine, policy).
- `core/repositories/` — `interfaces.py` (ABCs such as `IDeviceRepository`), `sqlalchemy/` (17 files — the live, production implementation wired into the DI container), `sqlite/` (8 files — an older, narrower parallel implementation **not** wired into the container).
- `core/security/` — password, jwt_tokens, mfa, tokens, crypto, ip, permissions, rate_limit, middleware, config.
- `core/storage/` — provider, factory, config, and one file per DB backend under `providers/`.
- `core/logging/` — config, context, factory, formatters, handlers, middleware, startup.
- `core/migrations/runner.py` — programmatic Alembic runner invoked at app startup.
- `core/container.py`, `core/logic.py` (config generation), `core/diff.py`, `core/validator.py`, `core/aesgcm.py` (hand-rolled crypto, explicitly documented as unsuitable for security-critical use), `core/migrations_legacy.py` and `core/handler.py` (both dead/reference-only).
- `api/` and `api/v1/` — `api/v1/router.py` assembles 15 sub-routers; `api/*.py` loose files are pre-versioning legacy and are **not imported by `app.py`**.
- `models/` — `base.py`, `inventory.py` (8 inventory models), `auth.py` (10 security/RBAC models).
- `schemas/` — only `auth.py` and `common.py` exist; there is no `schemas/inventory.py` (see API section).
- `formats/` — `yamldump.py`, `xlsxwriter.py`.

**Repository pattern.** Implemented via ABCs in `core/repositories/interfaces.py` with two concrete implementations: `sqlalchemy/` (17 files, the one actually wired into the DI container) and `sqlite/` (8 files, older and unused by the running app). The documentation itself flags this duplication as unresolved technical debt.

**Service layer.** One file per aggregate/concern in `core/services/`; each service takes its repositories via constructor injection and contains no direct DB access.

**Dependency injection.** `ServiceContainer` (`core/container.py`) is the single DI root: it builds the `StorageProvider` via `StorageFactory.create(config.database)`, then constructs all repositories and services with dependencies injected through constructors. FastAPI resolves it per-request via `Depends(get_container)` in `api/dependencies.py`, which reads `request.app.state.container`. Auth/permission checks follow the same pattern: `Depends(get_current_principal)` and `Depends(require_permission("code"))`.

**Middleware** (registered in `app.py`, actual execution order): `SecurityHeadersMiddleware` → `TrustedProxyMiddleware` → `AccessPolicyMiddleware` → `RateLimitMiddleware` → `CORSMiddleware` → `CorrelationIDMiddleware` → `RequestLoggingMiddleware` → route handler. There is no dedicated auth middleware — auth is enforced at the route level via FastAPI dependencies, not in the middleware chain.

---

## 4. Database

**Tables.**

*Inventory (JSON-blob entity tables, `id`/`data`/`updated_at`):* `devices`, `bandwidth_caps`, `subnets`, `tag_defs`, `lists` (PK `list_name`), `meta` (PK `key`), `audit_log`, `yaml_history`.

*Security/RBAC (normalized relational):* `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `api_keys`, `network_acls`, `mfa_backup_codes`.

**Relationships.** Security/RBAC tables use real SQL foreign keys (organizations → users/roles/api_keys/network_acls; users → user_roles/refresh_tokens/mfa_backup_codes/api_keys; roles ↔ permissions via `role_permissions`). Inventory tables deliberately have **no SQL foreign keys between each other** — device-to-subnet containment and tag relationships are resolved in application code from the JSON `data` blob, not enforced at the schema level. This is a stated simplicity tradeoff, and it's why multi-tenant `org_id` scoping of inventory tables is flagged as unbuilt (targeted for v0.7.0).

**Migrations.** Only two exist so far, applied automatically at startup by `core/migrations/runner.py`:

1. `0001_baseline_schema.py` — baseline schema, the 8 original inventory tables (schema version 4 of the legacy pre-Alembic system).
2. `0002_auth_and_security.py` — adds all 10 security/RBAC tables, extends `audit_log` with nullable columns (`org_id`, `source_ip`, `user_agent`, `resource_type`, `resource_id`, `result`, `correlation_id`), and seeds one default organization, the full permission catalog, and 5 system roles.

**SQLC configuration.** Not applicable — this is a Python/SQLAlchemy 2.x + Alembic stack, not Go. Alembic plays the schema-versioning role SQLC would play, and the SQLAlchemy ORM plays the query-layer role.

---

## 5. API

All endpoints are under `/api/v1`, assembled from 15 sub-routers in `api/v1/router.py`. Legacy duplicate unversioned files exist under `api/*.py` but are not imported by `app.py` — dead code flagged for deletion.

- **Auth** — login, MFA verify, token refresh, logout / logout-all, current-user, password change, MFA enroll (begin/confirm)/disable, session list/revoke.
- **Users & Roles** — user CRUD + reactivate + role assignment + admin password reset; role CRUD + permission catalog + permission editing.
- **API Keys & Policies** — API key CRUD; network ACL (IP policy) CRUD + enable/disable toggle.
- **Inventory** (devices, bandwidth, subnets — identical pattern across all three) — list, validate-import, import, create, delete.
- **Tags & Lists** — tag CRUD + usage lookup; list CRUD + usage lookup.
- **Generate & History** — generate config, list/retrieve generation history entries.
- **Export / Audit / Meta** — Excel export per inventory type, audit log list/search, app metadata.

**Request/response models.** `schemas/auth.py` has explicit, strict Pydantic models for auth/RBAC/policy request bodies, plus a custom `EmailStr` validator that deliberately allows internal-only TLDs like `.local`. `schemas/common.py` has loose, `extra="allow"` envelope models for inventory objects — these wrap `dict[str, Any]` payloads rather than fully field-typed models. There is no `schemas/inventory.py`; this is a noted gap.

**Authentication.** Bearer-token based, two forms disambiguated by prefix: JWT access tokens or API keys (`cfk_live_...`). `get_current_principal()` in `api/dependencies.py` decodes the JWT or authenticates the API key, then builds a `Principal` (kind, id, org_id, permissions, display name). Registered as a FastAPI `HTTPBearer` scheme so Swagger UI shows the Authorize lock icon. Invalidation uses the `perm_version` stamp described in ADR-0007.

**Authorization.** Fine-grained RBAC via `<resource>:<action>` permission codes, enforced exclusively through `require_permission(code)` / `require_any_permission(*codes)` — never a role-name check. Permission resolution goes through `rbac_service.get_effective_permissions()`. The Access Policy Engine additionally evaluates IP allow/deny both at the middleware layer (pre-auth, global rules) and again per-request once the caller's `org_id` is known.

---

## 6. Frontend

Two frontends exist on disk; the app serves exactly one at runtime — `frontend/out/` (Next.js) if it's been built, otherwise it falls back to `static/` (legacy vanilla JS, which predates the auth layer and sends no bearer token).

**Pages** (Next.js, `frontend/src/app/`): `(auth)/login`; `(app)/dashboard`; `(app)/inventory/{devices,bandwidth-profiles,subnets,templates,details}` **and a duplicate parallel tree** `(app)/infrastructure/{...}`; `(app)/configuration/{generate,generated,deployment-history}` **and duplicate parallel routes** `(app)/generate`, `(app)/history`; `(app)/validation/{run,findings,history}`; `(app)/administration/{users,roles,api-keys,audit-logs}` **and duplicate** `(app)/admin/{users,roles,api-keys,audit-logs,policies}`; `(app)/account/{profile,preferences,theme,notifications,sessions,mfa,api-tokens}`; `(app)/system/{global-settings,security-policies,authentication,storage,database,backup,smtp,integrations,licensing}`; a legacy `(app)/settings` page; `documentation/[slug]` (in-app doc viewer).

The project's own `VUEXY_MIGRATION_REPORT.md` confirms the duplicate route pairs (`inventory/` vs `infrastructure/`, `administration/` vs `admin/`, `configuration/*` vs `generate/`/`history/`) are leftovers of an in-progress UI migration; the migrated/live side of each pair is documented as unconfirmed. Roughly half of the System module's sub-pages (Storage, SMTP, Integrations, Licensing, Backup & Restore, Security Policies) are non-functional scaffolds with honest "Not connected — TODO" banners.

**Network Tree exists only in the legacy frontend** (`static/networktree.js`) — there is no equivalent in the Next.js app, so it's unreachable once `frontend/out/` is built (the normal deployment path). Porting it is the top item in the current sprint.

**Navigation.** `frontend/src/layouts/navConfig.tsx` defines nav groups and page titles; `AppLayout.tsx` composes Sidebar + Navbar + Footer as the authenticated app chrome.

**Components.** `common/` (ConfirmDialog, EmptyState, FormDrawer, GenerationHistoryList, PageHeader, PermissionTree, StatusChip, etc.), `navigation/` (Breadcrumbs, Navbar, Sidebar, UserMenu), `tables/` (DataGridToolbar), `docs/` (DocsShell, DocsContent, DocsSearch, KeyboardShortcutsModal), `ui/` (Toast, Modal, Spinner, ErrorBanner), `@core/` (vendored Vuexy base theme library), and feature modules under `modules/{generate,inventory,...}`. Known dead code from the migration: `AppShell.tsx`, `dashboard/StatCard.tsx`, `ui/Badge.tsx`, and four `layouts/components/` files, stubbed with `export {}` rather than deleted (blocked by a filesystem permission issue at the time).

**UI architecture.** Next.js App Router, static export (`output: 'export'`, built via `make build`, not committed to git). MUI 5 with the Vuexy visual theme, `@mui/x-data-grid`, `@mui/x-tree-view` (pinned to an older API), Tabler + Iconify icons, ApexCharts for dashboards. State: TanStack React Query for server state, local `useState`/`useReducer` for UI state (no Redux/Zustand), an `AuthProvider` context for auth. Forms use local `useState` validation throughout rather than Formik/React Hook Form — a deliberate mid-migration choice, flagged as technical debt (more verbose, no schema validation). A single API client (`lib/api.ts`) attaches bearer tokens automatically.

---

## 7. Security

**Authentication.** Argon2id password hashing with transparent rehash on login. Short-lived JWT access tokens (15 min default) plus opaque, hashed, rotate-on-use refresh tokens (14 days default) with reuse detection — theft of an already-rotated token revokes the whole token family. Session invalidation uses the `perm_version` stamp (ADR-0007) instead of a persistent blacklist. Configurable account lockout (default 5 attempts / 15 min). TOTP MFA (RFC 6238) with QR enrollment, two-step confirm, and 10 backup codes, encrypted at rest with AES-256-GCM via the audited `cryptography` package (explicitly not the hand-rolled `core/aesgcm.py`). API keys exist for service accounts (e.g. unattended SNMP collectors), hashed at rest, shown once, optionally scoped by permission list/IP allowlist/expiration. No external IdP/OIDC/SSO yet — planned for v0.7.0.

**RBAC.** Entirely permission-code based (`<resource>:<action>`), never a hardcoded role-name check. 16 permission codes across Inventory, Deployment, System, Access Management, and Audit. 5 system roles (Super Admin, Organization Admin, Operator, Read Only, Auditor) plus unlimited custom roles. New users start with **zero** permissions — every grant is explicit and auditable.

**Multi-tenancy.** Explicitly a partial/hybrid model: the entire security layer (users, roles, API keys, network ACLs, audit log) is fully organization-scoped and multi-tenant-ready. The inventory tables (devices, bandwidth, subnets, tags, lists, YAML history) are **not** — they remain single-tenant, implicitly scoped to one seeded "default" organization. Retrofitting is documented as a large, separate future migration. Super Admin is the one role that spans every org.

**Audit logging.** Every permission-checked mutation and every security-relevant event (login, MFA change, role change, API key lifecycle, policy change) is recorded with actor, org, source IP, user agent, resource, result, and correlation ID. Write-once/append-only, no update/delete API surface, queryable via `/api/v1/audit`. Nothing is auto-purged — retention/export tooling is a v0.7.0 item. A SOC 2 control mapping exists (CC6.1–CC7.3) but is explicitly a code-to-control mapping, not a certification; HIPAA/PCI-DSS controls and GDPR tooling are not implemented.

A second, independent layer runs before auth entirely: the **Access Policy Engine** (`AccessPolicyMiddleware`, IP allow/deny via network ACLs, first-match-wins by priority, IPv4+IPv6). Time-based access windows are scaffolded but always evaluate as "allowed" — not yet enforced, planned for v0.7.0.

---

## 8. Configuration Generation

**Datadog support** splits into two unrelated things:

- *Implemented today:* Datadog APM/observability instrumentation of ConfigFoundry itself (`ddtrace` on the backend, `dd-trace` on the frontend) — trace/span-ID log correlation. No other Datadog business logic exists in code.
- *Not implemented:* pushing generated YAML config to the Datadog API. `integrations/README.md` lists this as a planned integration targeted at v0.6.0, but the `integrations/` directory today contains only that README — zero implementation. Other listed integrations (NetBox, SNMP discovery, LDAP, ServiceNow, Slack, Grafana, OpenTelemetry, Prometheus) are unscheduled placeholders only.

**Templates.** There is no template-file system — no Jinja, no Mustache. Generation is fully programmatic: `core/logic.py::convert_to_collector_configs()` builds per-region config structures directly from devices, bandwidth, subnets, and tags in Python.

**YAML generation.** Output is rendered by a hand-rolled, dependency-free YAML dumper (`formats/yamldump.py`) that deliberately reimplements `yaml.dump(..., default_flow_style=False, sort_keys=False)` to avoid a pip dependency — the module docstring claims it's been fuzz-tested against real PyYAML across thousands of randomized trials, with one known limitation (long/multi-line scalars fall back to a single-line quoted form instead of PyYAML's line-folding). `POST /api/v1/generate` loads inventory data, converts it, renders YAML per region, runs validation against the same already-loaded data, persists a `yaml_history` snapshot, and writes an audit entry — all synchronously on the request thread (no job queue), which is a documented scalability limitation for large inventories. Nothing is written to disk server-side.

**Validation.** `core/validator.py::validate_inventory()` is a pure function (no DB/HTTP side effects) returning a flat list of findings (code, severity, category, message). 12 rules are implemented today (e.g. missing/invalid/duplicate device IPs, missing region, missing credentials, invalid subnet CIDR, orphaned bandwidth). Three rules are deliberately deferred, each with a stated reason in the code: `TAG_UNKNOWN_VALUE`, `TAG_WRONG_SCOPE`, `SUBNET_OVERLAP`. A deeper cross-field "Inventory Validation Engine" is on the v0.6.0 roadmap.

---

## 9. Completed Decisions

- All 7 ADRs are marked accepted and implemented: SQLite-default storage abstraction, permission-code RBAC, air-gap-first architecture, Alembic migrations, same-origin static frontend, URL-based API versioning, `perm_version` token invalidation.
- MVP scope is shipped as of v0.5.0 "Enterprise Preview": inventory CRUD, dynamic tags with subnet inheritance, YAML generation with history, enterprise auth (Argon2id/JWT/MFA/API keys), permission-code RBAC, IP Access Policy Engine, full audit trail, SQLite storage, verified air-gap deployment, in-app documentation portal.
- Repository-vs-release-artifact split: the git repo stays source-only (no prebuilt frontend, no vendored npm packages); those only ship in release bundles.
- ESLint tooling fixed and finalized (previously non-functional; now pinned dependencies and committed config).
- Testing philosophy: unit tests over integration tests where possible, standard-library-runnable, fully offline, enforced in CI (`backend-tests` job blocks merges on failure).
- Deployment model: single process, single database, no built-in load balancer/queue; one instance per team/environment behind a reverse proxy.
- Downgrade policy: migrations are additive/forward-only; rollback is done by restoring a pre-upgrade backup, not `alembic downgrade`.

---

## 10. Pending Decisions

- **Which repository implementation is authoritative** — `core/repositories/sqlalchemy/` (the one actually wired in) vs. `core/repositories/sqlite/` (older, unused) — flagged in three separate docs as needing confirmation and consolidation.
- **Frontend route-duplication resolution** — `inventory/` vs `infrastructure/`, `administration/` vs `admin/`, `configuration/*` vs `generate/`/`history/` — which side is live needs to be confirmed before the other is deleted.
- **Whether legacy unversioned `api/*.py` files should be deleted or archived** — needs confirmation of zero import references first.
- **PostgreSQL/MySQL/SQL Server implementation priority and timing** — SQL Server is slated for v0.7.0; Postgres prioritization is a recommendation, not yet a committed decision.
- **Time-based Access Policy enforcement design** — scaffolding exists (`evaluate_time_window()`) but isn't wired to actually deny anything yet.
- **Whether a genuine OSS/Enterprise commercial split is ever pursued** — explicitly stated as unresolved: "the architecture doesn't preclude it, but nothing in the roadmap commits to it either."
- **GDPR tooling timeline** — explicitly not committed to a timeline.
- **`theme/` directory disposition** — 558 MB of vendored Vuexy design-reference bundles at the repo root; recommendation to confirm it's reference-only and consider moving it out of the main tree, not yet actioned.
- **Whether `DiffViewer` in the generate UI computes diffs client-side or needs a backend diff endpoint** — a first-class backend diff is on the v0.6.0 roadmap but the current implementation approach wasn't confirmed by documentation.

---

## 11. Current TODO List

Prioritized from the roadmap docs and the two most recent audits (Technical Debt, Code Quality Report, UI/UX Audit — dated one week before this review).

**High priority / current sprint (v0.5.x — stabilization, no new features):**
1. Port the Network Tree pan/zoom diagram to the Next.js frontend — the one feature genuinely unavailable in the current UI, not merely undocumented.
2. Resolve the duplicate backend repository implementations (`sqlalchemy/` vs `sqlite/`).
3. Resolve duplicate frontend route trees and remove the losing side of each pair.
4. Fix `tests/README.md`, which still claims no tests exist despite 24 test files.
5. Persist Inventory Validation results server-side instead of React-Query in-memory cache only — flagged in the UI/UX audit as the single most consequential structural gap in the Validation module (lost on refresh/deep-link).
6. Delete or archive the legacy unversioned `api/*.py` files once confirmed unreferenced.
7. Delete the 8 stubbed dead frontend files once the underlying filesystem permission issue is resolved.

**Medium priority (v0.6.0 target):**
8. Datadog config-push integration (distinct from the already-shipped APM instrumentation).
9. Cross-field Inventory Validation Engine (beyond the current 12 rules).
10. `/health`, `/ready`, and Prometheus `/metrics` endpoints.
11. Inventory Health Dashboard, duplicate detection, device templates, backend YAML diff/change review.
12. MIB import/browsing.
13. Fix Notifications page toggles rendering as "on" despite an unconnected backend; add a bulk "Revoke all other sessions" action.

**Lower priority / later (v0.7.0+):**
14. SSO/OIDC/LDAP integration.
15. Real (non-scaffold) SQL Server, then likely PostgreSQL, implementation.
16. Time-based Access Policy enforcement.
17. Audit log / YAML history retention and export tooling.
18. Multi-tenant inventory scoping — described as the largest single migration on the roadmap.
19. HA support and a shared (Redis-backed) rate limiter for horizontal scaling.
20. Containerization (no Dockerfile exists today).
21. Expand backend test coverage to the 13 currently untested services, add repository coverage beyond SQLite device, add `formats/` tests, and stand up a frontend automated test suite (currently zero).
22. Full accessibility pass (chart `aria-label`s, keyboard-only nav, screen reader, mobile breakpoints below 1024px).
23. Clarify/relocate the 558 MB `theme/` reference bundle.

---

## 12. Project Structure

Cleaned tree (vendored/build directories pruned: `.venv`, `.git`, `node_modules`, `frontend/.next`, `__pycache__`, `.obsidian`; `theme/` and `vendor/` summarized rather than expanded since they're not project source):

```
.
├── .env, .gitignore, .DS_Store
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/ci.yml
├── API Documentation/            (9 files — Overview, Auth, Inventory, Tags & Lists,
│                                   Users & Roles, API Keys & Policies, Export & Audit,
│                                   Generate & History, Versioning)
├── Architecture/
│   ├── Decisions/                (ADR Index + ADR-0001..0007)
│   └── Diagrams/                 (Component Relationships, Data Flow, Deployment,
│                                   Request Flow, System Architecture, User Journey)
├── Architecture Overview.md
├── Backend/                      (Backend Overview, Logging Framework, Storage Abstraction)
├── CHANGELOG.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md, LICENSE, SECURITY.md, README.md
├── ConfigFoundry_UIUX_Audit_Report.md
├── Database/ (empty) · Database Overview.md
├── Deployment/                   (Air-Gap, Overview, Development Setup,
│                                   Production Deployment, Upgrade & Rollback)
├── Development/                  (Changelog, Code Quality Report, Engineering Wiki,
│                                   Technical Debt)
├── Executive Summary.md
├── Features/                     (Features.md + 11 Feature-* files)
├── Frontend Documentation/Frontend Overview.md
├── Glossary/Glossary.md
├── Integrations Documentation/   (Datadog APM, Integrations Overview)
├── Makefile
├── Meetings/README.md            (placeholder — empty)
├── Operations/                   (Operations.md + 5 runbooks: Deployment,
│                                   Monitoring & Health Checks, Troubleshooting,
│                                   Backup & Recovery, Incident Response)
├── Product/                      (Competitive Advantages, OSS vs Enterprise,
│                                   Pricing Ideas, Product Vision, Target Users & Use Cases)
├── Repository Overview.md
├── Research/README.md            (placeholder — empty)
├── Roadmap/                      (Overview, Current Sprint, Future Ideas,
│                                   Long-term Vision, MVP, Next Sprint, v1, v2 - Enterprise)
├── Security/                     (Access Policy Engine, Authentication,
│                                   Authorization & RBAC, RBAC Permission Catalog,
│                                   SOC 2 Compliance Mapping, Secrets & Configuration,
│                                   Security Overview)
├── Testing/Testing Strategy.md
├── alembic/                      (env.py, script.py.mako,
│                                   versions/0001_baseline_schema.py,
│                                            0002_auth_and_security.py)
├── alembic.ini
├── api/                          (legacy top-level: dead code, not imported by app.py)
│   └── v1/                       (api_keys, audit, auth, bandwidth, devices, export,
│                                   generate, history, lists, meta, policies, roles,
│                                   router, subnets, tags, users)
├── app.py, server.py
├── core/
│   ├── aesgcm.py, container.py, diff.py, handler.py, logic.py,
│   │   migrations_legacy.py, validator.py
│   ├── logging/                  (config, context, factory, formatters,
│   │                               handlers, middleware, startup)
│   ├── migrations/runner.py
│   ├── repositories/              (interfaces + sqlalchemy/* [live] + sqlite/* [unused])
│   ├── security/                  (aesgcm, config, crypto, ip, jwt_tokens, mfa,
│   │                                middleware, password, permissions, rate_limit, tokens)
│   ├── services/                  (18 files — api_key, audit, auth, bandwidth, device,
│   │                                export, generate, history, import, list, meta, mfa,
│   │                                organization, policy_engine, policy, rbac, role,
│   │                                subnet, tag, user)
│   └── storage/                   (config, factory, provider,
│                                    providers/{mysql,postgresql,sqlite,sqlserver})
├── db/                            (configfoundry.db + WAL/SHM, README.md)
├── docs/                          (28 published docs, rendered into the in-app
│                                    Documentation module)
├── examples/README.md
├── formats/                       (xlsxwriter.py, yamldump.py)
├── frontend/                      (Next.js — src/app, src/modules, src/components,
│                                    src/@core [Vuexy port], src/lib, src/providers,
│                                    src/theme; frontend/out/ generated static export;
│                                    VUEXY_MIGRATION_REPORT.md,
│                                    VUEXY_INTEGRATION_MIGRATION_MAP.md)
├── install_offline.sh/.ps1, run_offline.sh/.ps1, upgrade_offline.sh/.ps1
├── integrations/README.md         (contract only — no implementations yet)
├── models/                        (auth.py, base.py, inventory.py)
├── requirements.txt, requirements-dev.txt
├── schemas/                       (auth.py, common.py — no inventory.py yet)
├── scripts/                       (build_npm_offline_vendor.sh,
│                                    build_python_wheelhouse.sh,
│                                    build_release_bundle.sh, validate_airgap.py)
├── static/                        (legacy pre-auth vanilla-JS UI + self-hosted
│                                    Swagger/ReDoc assets)
├── tests/                         (24 files across api/, handler/, logging/, logic/,
│                                    migrations/, repositories/, security/, services/,
│                                    storage/)
└── tools/debug.py

theme/   (558 MB — vendored Vuexy UI-kit reference bundle; design source, not shipped code)
vendor/  (36 MB — air-gap dependency vendoring: npm/, python/, python-dev/)
```

---

## 13. Known Issues or Assumptions

**Documentation/code drift**
- `tests/README.md` still says "no test code exists yet" while 24 test files actually exist — flagged repeatedly across three separate docs as an easy, symbolic fix.

**Coverage and quality gaps**
- 13 backend services have no test coverage (bandwidth, subnet, tag, list, export, user, role, organization, mfa, api_key, policy, history, import services); no repository tests beyond SQLite device; no `formats/` tests; zero frontend automated tests of any kind (no Jest/Vitest/Playwright configured).
- No Python linter is configured — a deliberate tradeoff to minimize air-gap-relevant pinned dependencies, meaning style consistency depends entirely on code-review discipline.

**Structural/architectural risks**
- SQLite's single-writer model means concurrent write-heavy load can hit "database is locked" — explicitly untested for multi-instance concurrent writes; PostgreSQL is recommended for that topology but isn't implemented yet.
- The security layer is fully multi-tenant (organization-scoped); the inventory tables are not. Hard tenant isolation today requires separate instances.
- `X-Forwarded-For` trust misconfiguration (an unset or overly broad trusted-proxies setting) would let IP spoofing bypass the Access Policy Engine — flagged as a high-severity risk if misconfigured.
- Default secrets (JWT signing secret, encryption key) default to a random value generated per restart if not explicitly set in production — high severity if overlooked, and losing the encryption key permanently breaks existing MFA enrollments even with an intact database.
- Two parallel backend repository implementations exist with no clear authority; two duplicate sets of frontend routes exist with no clear "which is live" answer, per the project's own migration report.
- A hand-rolled crypto module (`core/aesgcm.py`) sits in the security-adjacent namespace unused for anything sensitive, but is a latent risk purely by name similarity to the real, audited crypto path.

**Explicitly-not-yet-verified items** (from the UI/UX audit, one week before this review): some System module sub-pages, some Account sub-pages, exhaustive mobile-breakpoint testing (below 1024px), full keyboard-only navigation, and screen-reader testing were not live-verified in that audit session and are called out as such rather than assumed fine.

**Operational assumptions**
- No Dockerfile/container image exists — deployment is bare-metal/VM under systemd or the air-gap installer scripts.
- No rolling-restart or blue-green deployment story; restarts cause brief downtime, treated as acceptable for the target use case (internal team tool).
- Nothing is auto-purged from the audit log or YAML history today — storage growth planning is left to the operator until retention/export tooling ships (v0.7.0 target).
- The bootstrap Super Admin password is printed exactly once at first startup and is not recoverable if lost.
- A stray duplicate database file pair exists in `db/` (`configfoundry 2.db-shm/-wal`) that doesn't match the documented backup-naming convention — likely a leftover from a manual copy operation rather than an intentional artifact.

**Empty/placeholder areas**
- `Research/` and `Meetings/` folders in the vault are explicitly empty placeholders reserved for future use (e.g., future SSO-provider evaluation before v2 Enterprise work).
- `integrations/` contains only a README describing planned integrations (Datadog config-push, NetBox, SNMP discovery, LDAP, ServiceNow, Slack, Grafana, OpenTelemetry, Prometheus) — none are implemented.
