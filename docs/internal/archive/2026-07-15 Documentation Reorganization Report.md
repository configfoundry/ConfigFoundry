# Documentation Reorganization Report — 2026-07-15

Full record of the repo-wide documentation consolidation: two pre-existing,
independent documentation sets (the app-wired `docs/` folder and a
root-level Obsidian vault) merged into a single `docs/` hierarchy. Filed
here in `docs/internal/archive/` as a historical record of the change, not
as living documentation — see `docs/index.md` for the current docs home.

## 1. Final documentation tree

```
docs/
├── index.md                      (documentation home / index)
├── getting-started/              (4)   first run, install, features, FAQ
├── architecture/                 (18)  system design, diagrams, storage, logging, ADR-adjacent overviews
├── adr/                          (9)   Architecture Decision Records (ADR-0001..0008 + index)
├── api/                          (11)  REST reference, versioning, per-resource endpoint docs
├── security/                     (12)  auth, authz, RBAC, MFA, SOC 2, secrets
├── development/                  (7)   dev guide, contributing, testing, release process
├── deployment/                   (17)  deployment, air-gap, upgrade, monitoring + runbooks/ (6)
├── integrations/                 (2)   integrations overview, Datadog APM
├── roadmap/                      (9)   roadmap, sprints, MVP, v1/v2 plans
├── reference/                    (16)  configuration, glossary, repo tour + features/ (13)
└── internal/                     (14)  non-public: product/ (6), meetings/ (1), research/ (1), archive/ (6)

119 files total under docs/ (105 public + 14 internal, including this report)
```

Repo root now contains only: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE` — plus `.github/` issue/PR
templates (GitHub-specific config, not project documentation, left as-is).
Package-local READMEs (`db/README.md`, `examples/README.md`,
`integrations/README.md`, `tests/README.md`) were also left in place —
these document the folder they live in for someone browsing that code on
GitHub, a different purpose than project-wide docs, and moving them would
hurt discoverability.

## 2. What changed and why (two decisions made with you before touching anything)

- **Two doc sets existed, not one.** `docs/` (28 files) was already a
  curated, flat, professionally-written doc set wired into the live app —
  `frontend/src/lib/docs.ts` reads it at build time to power
  `/documentation`, and it throws a build error if the shape changes. A
  separate root-level Obsidian vault (`Architecture/`, `API Documentation/`,
  `Security/`, etc., `.obsidian/` present) held a second, independently
  authored set covering similar ground. You chose to restructure `docs/`
  into the new taxonomy too, and have `docs.ts` (and the doc-viewer route)
  updated to match — see §5.
- **Non-public material** (`Product/`, `Meetings/`, `Research/`, dated
  status snapshots, a UI/UX audit report, the Vuexy migration reports) went
  into `docs/internal/`, excluded from the public docs viewer and its
  search index.

## 3. Every document moved (118)

Format: `old path  ->  new path`. All moves used `git mv` (2 files that
were never committed yet — `ADR-0008` and the `2026-07-14` status snapshot
— were moved with `mv` + `git add` instead, since `git mv` requires the
source to already be tracked).

```
API Documentation/API Keys & Policies Endpoints.md  ->  docs/api/API Keys & Policies Endpoints.md
API Documentation/API Overview.md  ->  docs/api/API Overview.md
API Documentation/API Versioning.md  ->  docs/api/API Versioning.md
API Documentation/Auth Endpoints.md  ->  docs/api/Auth Endpoints.md
API Documentation/Export & Audit Endpoints.md  ->  docs/api/Export & Audit Endpoints.md
API Documentation/Generate & History Endpoints.md  ->  docs/api/Generate & History Endpoints.md
API Documentation/Inventory Endpoints.md  ->  docs/api/Inventory Endpoints.md
API Documentation/Tags & Lists Endpoints.md  ->  docs/api/Tags & Lists Endpoints.md
API Documentation/Users & Roles Endpoints.md  ->  docs/api/Users & Roles Endpoints.md
Architecture Overview.md  ->  docs/architecture/Architecture Overview.md
Architecture/Decisions/ADR Index.md  ->  docs/adr/ADR Index.md
Architecture/Decisions/ADR-0001 - SQLite Default with StorageProvider Abstraction.md  ->  docs/adr/ADR-0001 - SQLite Default with StorageProvider Abstraction.md
Architecture/Decisions/ADR-0002 - Permission-Code RBAC.md  ->  docs/adr/ADR-0002 - Permission-Code RBAC.md
Architecture/Decisions/ADR-0003 - Air-Gap-First Architecture.md  ->  docs/adr/ADR-0003 - Air-Gap-First Architecture.md
Architecture/Decisions/ADR-0004 - Alembic Migrations.md  ->  docs/adr/ADR-0004 - Alembic Migrations.md
Architecture/Decisions/ADR-0005 - Same-Origin Static Frontend.md  ->  docs/adr/ADR-0005 - Same-Origin Static Frontend.md
Architecture/Decisions/ADR-0006 - URL-Based API Versioning.md  ->  docs/adr/ADR-0006 - URL-Based API Versioning.md
Architecture/Decisions/ADR-0007 - perm_version Token Invalidation.md  ->  docs/adr/ADR-0007 - perm_version Token Invalidation.md
Architecture/Decisions/ADR-0008 - Platform Adapter Architecture.md  ->  docs/adr/ADR-0008 - Platform Adapter Architecture.md
Architecture/Diagrams/Component Relationships.md  ->  docs/architecture/Component Relationships.md
Architecture/Diagrams/Data Flow.md  ->  docs/architecture/Data Flow.md
Architecture/Diagrams/Deployment Diagram.md  ->  docs/architecture/Deployment Diagram.md
Architecture/Diagrams/Request Flow.md  ->  docs/architecture/Request Flow.md
Architecture/Diagrams/System Architecture.md  ->  docs/architecture/System Architecture.md
Architecture/Diagrams/User Journey.md  ->  docs/architecture/User Journey.md
Backend/Backend Overview.md  ->  docs/architecture/Backend Overview.md
Backend/Logging Framework.md  ->  docs/architecture/Logging Framework.md
Backend/Storage Abstraction.md  ->  docs/architecture/Storage Abstraction.md
ConfigFoundry_UIUX_Audit_Report.md  ->  docs/internal/archive/ConfigFoundry_UIUX_Audit_Report.md
Database Overview.md  ->  docs/architecture/Database Overview.md
Deployment/Air-Gap Deployment.md  ->  docs/deployment/Air-Gap Deployment.md
Deployment/Deployment Overview.md  ->  docs/deployment/Deployment Overview.md
Deployment/Development Setup.md  ->  docs/deployment/Development Setup.md
Deployment/Production Deployment.md  ->  docs/deployment/Production Deployment.md
Deployment/Upgrade & Rollback.md  ->  docs/deployment/Upgrade & Rollback.md
Development/Changelog.md  ->  docs/internal/archive/Changelog (redundant summary of root CHANGELOG.md).md
Development/Code Quality Report.md  ->  docs/development/Code Quality Report.md
Development/Engineering Wiki.md  ->  docs/development/Engineering Wiki.md
Development/Technical Debt.md  ->  docs/development/Technical Debt.md
Executive Summary.md  ->  docs/internal/product/Executive Summary.md
Features/Feature - API Keys.md  ->  docs/reference/features/Feature - API Keys.md
Features/Feature - Audit Log & History.md  ->  docs/reference/features/Feature - Audit Log & History.md
Features/Feature - Authentication & MFA.md  ->  docs/reference/features/Feature - Authentication & MFA.md
Features/Feature - Dashboard.md  ->  docs/reference/features/Feature - Dashboard.md
Features/Feature - Documentation Portal.md  ->  docs/reference/features/Feature - Documentation Portal.md
Features/Feature - Dynamic Tags.md  ->  docs/reference/features/Feature - Dynamic Tags.md
Features/Feature - Excel Import Export.md  ->  docs/reference/features/Feature - Excel Import Export.md
Features/Feature - IP Access Policies.md  ->  docs/reference/features/Feature - IP Access Policies.md
Features/Feature - Inventory Management.md  ->  docs/reference/features/Feature - Inventory Management.md
Features/Feature - Network Tree.md  ->  docs/reference/features/Feature - Network Tree.md
Features/Feature - RBAC & Access Management.md  ->  docs/reference/features/Feature - RBAC & Access Management.md
Features/Feature - YAML Config Generation.md  ->  docs/reference/features/Feature - YAML Config Generation.md
Features/Features.md  ->  docs/reference/features/Features.md
Frontend Documentation/Frontend Overview.md  ->  docs/architecture/Frontend Overview.md
Glossary/Glossary.md  ->  docs/reference/Glossary.md
Integrations Documentation/Datadog APM.md  ->  docs/integrations/Datadog APM.md
Integrations Documentation/Integrations Overview.md  ->  docs/integrations/Integrations Overview.md
Meetings/README.md  ->  docs/internal/meetings/README.md
Operations/Operations.md  ->  docs/deployment/runbooks/Operations.md
Operations/Runbook - Backup & Recovery.md  ->  docs/deployment/runbooks/Runbook - Backup & Recovery.md
Operations/Runbook - Deployment.md  ->  docs/deployment/runbooks/Runbook - Deployment.md
Operations/Runbook - Incident Response.md  ->  docs/deployment/runbooks/Runbook - Incident Response.md
Operations/Runbook - Monitoring & Health Checks.md  ->  docs/deployment/runbooks/Runbook - Monitoring & Health Checks.md
Operations/Runbook - Troubleshooting.md  ->  docs/deployment/runbooks/Runbook - Troubleshooting.md
Product/Competitive Advantages.md  ->  docs/internal/product/Competitive Advantages.md
Product/OSS vs Enterprise.md  ->  docs/internal/product/OSS vs Enterprise.md
Product/Pricing Ideas.md  ->  docs/internal/product/Pricing Ideas.md
Product/Product Vision.md  ->  docs/internal/product/Product Vision.md
Product/Target Users & Use Cases.md  ->  docs/internal/product/Target Users & Use Cases.md
Repository Overview.md  ->  docs/reference/Repository Overview.md
Research/README.md  ->  docs/internal/research/README.md
Roadmap Overview.md  ->  docs/roadmap/Roadmap Overview.md
Roadmap/Current Sprint.md  ->  docs/roadmap/Current Sprint.md
Roadmap/Future Ideas.md  ->  docs/roadmap/Future Ideas.md
Roadmap/Long-term Vision.md  ->  docs/roadmap/Long-term Vision.md
Roadmap/MVP.md  ->  docs/roadmap/MVP.md
Roadmap/Next Sprint.md  ->  docs/roadmap/Next Sprint.md
Roadmap/v1.md  ->  docs/roadmap/v1.md
Roadmap/v2 - Enterprise.md  ->  docs/roadmap/v2 - Enterprise.md
Security/Access Policy Engine.md  ->  docs/security/Access Policy Engine.md
Security/Authentication.md  ->  docs/security/Authentication Overview.md   [renamed -- see §4]
Security/Authorization & RBAC.md  ->  docs/security/Authorization & RBAC.md
Security/RBAC Permission Catalog.md  ->  docs/security/RBAC Permission Catalog.md
Security/SOC 2 Compliance Mapping.md  ->  docs/security/SOC 2 Compliance Mapping.md
Security/Secrets & Configuration.md  ->  docs/security/Secrets & Configuration.md
Security/Security Overview.md  ->  docs/security/Security Overview.md
Status Review - 2026-07-14.md  ->  docs/internal/archive/Status Review - 2026-07-14.md
Testing/Testing Strategy.md  ->  docs/development/Testing Strategy.md
docs/airgap.md  ->  docs/deployment/airgap.md
docs/api-versioning.md  ->  docs/api/api-versioning.md
docs/api.md  ->  docs/api/api.md
docs/architecture.md  ->  docs/architecture/architecture.md
docs/authentication.md  ->  docs/security/authentication.md
docs/authorization.md  ->  docs/security/authorization.md
docs/compliance-soc2.md  ->  docs/security/compliance-soc2.md
docs/configuration.md  ->  docs/reference/configuration.md
docs/contributing.md  ->  docs/development/contributing.md
docs/database-migrations.md  ->  docs/architecture/database-migrations.md
docs/deployment.md  ->  docs/deployment/deployment.md
docs/development.md  ->  docs/development/development.md
docs/enterprise.md  ->  docs/deployment/enterprise.md
docs/faq.md  ->  docs/getting-started/faq.md
docs/features.md  ->  docs/getting-started/features.md
docs/getting-started.md  ->  docs/getting-started/getting-started.md
docs/installation.md  ->  docs/getting-started/installation.md
docs/logging.md  ->  docs/architecture/logging.md
docs/migrations.md  ->  docs/architecture/migrations.md
docs/monitoring.md  ->  docs/deployment/monitoring.md
docs/rbac.md  ->  docs/security/rbac.md
docs/release-process.md  ->  docs/development/release-process.md
docs/roadmap.md  ->  docs/roadmap/roadmap.md
docs/security.md  ->  docs/security/security.md
docs/storage-architecture.md  ->  docs/architecture/storage-architecture.md
docs/storage.md  ->  docs/architecture/storage.md
docs/troubleshooting.md  ->  docs/deployment/troubleshooting.md
docs/upgrade.md  ->  docs/deployment/upgrade.md
frontend/VUEXY_INTEGRATION_MIGRATION_MAP.md  ->  docs/internal/archive/VUEXY_INTEGRATION_MIGRATION_MAP.md
frontend/VUEXY_MIGRATION_REPORT.md  ->  docs/internal/archive/VUEXY_MIGRATION_REPORT.md
```

### Deleted (2, both 0-byte Obsidian scratch files)

- `2026-07-09.md` — empty daily note
- `Untitled.md` — empty untitled note

## 4. Renames beyond a directory move (1)

`Security/Authentication.md` → `docs/security/Authentication Overview.md`.
Forced rename: on a case-insensitive filesystem (macOS default), it would
otherwise collide with `docs/authentication.md` (moved to
`docs/security/authentication.md`) in the same target directory. No other
renames were made — every other file kept its exact original name, only
its directory changed.

## 5. Links updated

- **279** standard Markdown links (`[text](path)`) repaired to point at
  new locations, across every file whose relative-link targets moved.
- **802** Obsidian `[[wiki-links]]` (including path-qualified and
  piped-alias forms, and ones inside table cells using `\|` escaping)
  converted to standard `[text](path)` Markdown links. This was necessary,
  not cosmetic: GitHub does not render `[[wiki-link]]` syntax at all
  outside an actual GitHub wiki, so every one of these was already
  rendering as broken literal text on GitHub before this change.
- **1,081 link edits total**, verified against the moved-file mapping and
  checked twice (once as part of the rewrite, once as an independent
  re-scan afterward, see §7).
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, and `docs/index.md` were included — all had links
  into the moved doc set and are now correct.
- `frontend/src/lib/docs.ts`, `frontend/src/app/documentation/page.tsx`,
  `frontend/src/modules/dashboard/DashboardOnboarding.tsx`, and
  `frontend/src/components/common/GenerationHistoryList.tsx` had
  hardcoded `/documentation/<old-slug>` app links updated to the new
  nested slugs (e.g. `/documentation/getting-started` →
  `/documentation/getting-started/getting-started`).

### Application code changes (scope note)

This was meant to be an organizational refactor only, but restructuring
the *existing* `docs/` folder (as opposed to only the newly-merged wiki
content) genuinely required two application-code changes — flagged to you
before starting, and you explicitly approved touching `docs.ts` for this
purpose:

1. **`frontend/src/lib/docs.ts`** — `listDocSlugs()`/`getAllDocsMeta()`
   now walk `docs/` recursively (excluding `docs/internal/`) instead of
   reading a flat directory + hardcoded `NAV_GROUPS` array. Nav grouping
   is now directory-driven (one group per top-level `docs/` subfolder), so
   new docs added under an existing category show up automatically — the
   old design required an app-code edit for every new doc. The "fail
   loudly on drift" property is preserved: an unrecognized top-level
   folder, or an empty one, still throws at build time.
2. **`frontend/src/app/documentation/[slug]/` → `[...slug]/`** — the doc
   viewer's dynamic route had to become a catch-all, since slugs are now
   multi-segment paths (e.g. `architecture/architecture`) and a single
   `[slug]` segment can't represent that. `generateStaticParams()` and the
   page component were updated for the resulting `string[]` param shape.

## 6. Duplicate / overlapping content found (flagged, not merged — needs your call)

Per your instruction, nothing below was merged or deleted. Sizes shown to
help you judge which is the better keeper.

| Topic | File A (from `docs/`) | File B (from the wiki) |
|---|---|---|
| Architecture overview | `docs/architecture/architecture.md` (135 ln) | `docs/architecture/Architecture Overview.md` (182 ln) |
| Air-gap deployment | `docs/deployment/airgap.md` (235 ln) | `docs/deployment/Air-Gap Deployment.md` (72 ln) |
| Deployment | `docs/deployment/deployment.md` (127 ln) | `docs/deployment/Deployment Overview.md` (64 ln), `docs/deployment/Production Deployment.md` (88 ln) |
| Upgrades | `docs/deployment/upgrade.md` (105 ln) | `docs/deployment/Upgrade & Rollback.md` (53 ln) |
| Roadmap | `docs/roadmap/roadmap.md` (156 ln) | `docs/roadmap/Roadmap Overview.md` (40 ln) |
| Dev guide | `docs/development/development.md` (145 ln) | `docs/development/Engineering Wiki.md` (60 ln) |
| Security model | `docs/security/security.md` (120 ln) | `docs/security/Security Overview.md` (67 ln) |
| API versioning | `docs/api/api-versioning.md` (186 ln) | `docs/api/API Versioning.md` (36 ln) |

In every pair, the `docs/`-originated file is the deeper, more complete
version; the wiki-originated file is a shorter overview covering the same
ground. None are byte-identical — genuinely overlapping, not accidental
copies.

**One confirmed, self-declared duplicate** (not just topic overlap):
`docs/internal/archive/Changelog (redundant summary of root CHANGELOG.md).md`
opens with *"Summary of `CHANGELOG.md` at the repository root — see that
file for the authoritative, full-text version"* — i.e. it says itself that
it's redundant. Already routed to `docs/internal/archive/` rather than the
public tree; recommend deleting outright once you've glanced at it,
distinct from the topic-overlap pairs above which are genuinely each worth
keeping a conversation about.

## 7. Validation performed

- **Broken links: 0.** Independent link-checker script scanned all 131
  Markdown files repo-wide (302 relative links), confirmed after the
  rewrite — zero unresolved targets.
- **Remaining `[[wiki-link]]` syntax: 0** — full conversion confirmed.
- **`docs/internal/` isolation: confirmed** — no public doc links into
  `internal/`, and `docs.ts` excludes it from both the nav and the search
  index by construction.
- **`tsc --noEmit`: clean.** **`next lint` on all touched files: clean.**
- **`docs.ts` logic executed directly** (Node, outside the Next.js build
  pipeline — see caveat below) against the real `docs/` tree: 105 public
  slugs, correctly grouped into the 10 categories, 0 missing files, 0
  leaked `internal/` slugs.
- **Caveat:** a full `next build` could not be run in this sandbox — the
  ARM64 `@next/swc` binary crashes here regardless of this change (a
  pre-existing, documented sandbox limitation — see the archived Vuexy
  migration report in this same folder). `tsc` + direct logic execution
  are strong but not a substitute for one real `make build` / `make serve`
  on your machine before you consider this fully verified.
- Full backend test suite unaffected (no Python files touched by this
  task) — not re-run.

## 8. Recommendations (no action taken — your call)

1. **Delete** `docs/internal/archive/Changelog (redundant summary of root CHANGELOG.md).md`
   — self-declared redundant with root `CHANGELOG.md`.
2. **Decide a keeper** for each of the 8 duplicate-topic pairs in §6 —
   recommend keeping the `docs/`-originated (deeper) version as the public
   page and either deleting the wiki-originated one or folding any unique
   detail from it into the keeper, case by case.
3. **Run `make build` / `make serve` locally** to get a real Next.js static
   export check, since this sandbox can't produce one (see §7 caveat).
4. **`.obsidian/`** at the repo root still points at the old vault layout
   (e.g. any daily-notes folder setting referencing the now-deleted
   `2026-07-09.md`). Harmless if nobody opens this repo in Obsidian going
   forward; worth a manual look if someone still does.
5. Consider whether `docs/internal/archive/` (6 files, including this
   report) belongs in the public git history at all long-term, or should
   move to an internal wiki/drive outside the repo — it's now
   git-history-preserved either way, so there's no urgency.
