# Frontend Overview

Parent: [Repository Overview](../reference/Repository Overview.md) · [Architecture Overview](Architecture Overview.md)

Two frontends exist in this repository; only one is served at a time.

| Frontend | Location | Served when | Status |
|---|---|---|---|
| **Next.js ("Vuexy")** | `frontend/src/` -> built to `frontend/out/` | `frontend/out/` exists | Current, actively developed |
| **Legacy vanilla-JS** | `static/` | `frontend/out/` does not exist (bare source checkout without `make build`) | Superseded, but still the only place [Network Tree](../reference/features/Feature - Network Tree.md) exists |

`app.py::create_app()` picks whichever exists, preferring `frontend/out/`; there is no way to run both simultaneously — see [Architecture Overview](Architecture Overview.md#frontend-architecture).

## Pages (App Router)

Route = folder, under `frontend/src/app/`:

| Route group | Pages |
|---|---|
| `(auth)/` | `login` |
| `(app)/dashboard` | Dashboard |
| `(app)/inventory` | `devices`, `bandwidth-profiles`, `subnets`, `templates`, `details` |
| `(app)/infrastructure` | `devices`, `bandwidth-profiles`, `subnets`, `templates`, `details` — **duplicate of `inventory/`, see below** |
| `(app)/configuration` | `generate`, `generated`, `deployment-history` |
| `(app)/generate`, `(app)/history` | Older/parallel routes to `configuration/*` — **also duplicated, see below** |
| `(app)/validation` | `run`, `findings`, `history` |
| `(app)/administration` | `users`, `roles`, `api-keys`, `audit-logs` |
| `(app)/admin` | `users`, `roles`, `api-keys`, `audit-logs`, `policies` — **duplicate of `administration/`, see below** |
| `(app)/account` | `profile`, `preferences`, `theme`, `notifications`, `sessions`, `mfa`, `api-tokens` |
| `(app)/system` | `global-settings`, `security-policies`, `authentication`, `storage`, `database`, `backup`, `smtp`, `integrations`, `licensing` |
| `(app)/settings` | Settings (legacy, pre-Vuexy CSS) |
| `documentation/[slug]` | In-app documentation viewer (renders this kind of content) |

> [!WARNING]
> **Duplicate route trees**, per `frontend/VUEXY_MIGRATION_REPORT.md`: `inventory/` vs `infrastructure/`, `administration/` vs `admin/`, and `configuration/{generate,generated,deployment-history}` vs `generate/`/`history/` appear to be parallel naming schemes from an in-progress "Vuexy" UI migration. The migrated, actively-used pages are `(app)/dashboard`, `(app)/inventory/*`, `(app)/validation/*`, `(app)/configuration/*` (per the migration report's own file list), with `modules/inventory`, `modules/validation`, `modules/generate`, `modules/administration`, `modules/dashboard`, `modules/auth` as their view components. Confirm which route in each duplicate pair is actually linked from navigation before treating both as live — flagged in [Technical Debt](../development/Technical Debt.md) and [Code Quality Report](../development/Code Quality Report.md).

## Components

```
frontend/src/
  components/
    common/       EmptyState, ConfirmDialog, FormDrawer, StatCard, StatusChip, PermissionTree, MiniBarChart, Footer
    navigation/    Sidebar, Navbar, UserMenu, Breadcrumbs
    tables/        DataGridToolbar
    docs/           DocsShell, DocsContent, DocsSearch, KeyboardShortcutsModal
    ui/              Toast, Modal, Spinner, ErrorBanner, EmptyState
  @core/            Vendored/base theme component library (Vuexy foundation)
```

Per the migration report, `components/AppShell.tsx`, `components/dashboard/StatCard.tsx`, `components/ui/Badge.tsx`, and four files under `layouts/components/` are **dead stubs** (`export {}` only, zero remaining imports) that the migration process could not delete due to a filesystem permission restriction in that environment — see [Code Quality Report](../development/Code Quality Report.md) for the exact list and cleanup recommendation.

## Layouts

`frontend/src/layouts/AppLayout.tsx` — the Vuexy shell (Sidebar + Navbar + Footer composition) — and `layouts/navConfig.tsx` (nav groups, page titles, drawer width) define the authenticated app chrome. `frontend/src/@core/layouts/` holds the base layout primitives the Vuexy theme is built from.

## Hooks & Context

`frontend/src/@core/hooks/` and `frontend/src/@core/context/` hold theme-mode and layout-settings hooks/context from the Vuexy base. Application-level context (auth, query client) lives in `frontend/src/providers/`:

- `AuthProvider` — authentication state, token storage, redirect-on-401 logic
- `QueryProvider` — TanStack React Query client setup
- `ThemeModeProvider` — dark/light mode, applied before paint to avoid a flash of the wrong theme

## Theme

`frontend/src/theme/index.ts` + `theme/palette.ts` — Vuexy design tokens translated into an MUI theme. `frontend/src/@core/theme/` and `frontend/src/@core/styles/` hold the base Vuexy theme this was adapted from. See [Code Quality Report](../development/Code Quality Report.md) regarding the vendored `theme/` reference templates at the repository root (django-version, laravel-version, nuxt-version, react-version, vue-version — not part of the running app, kept for reference only).

## Routing

Next.js App Router — folders are routes, `(app)` and `(auth)` are route groups (no URL segment, used to apply different layouts). No client-side router library beyond Next.js's own.

## State management

- **Server state:** TanStack React Query (`@tanstack/react-query`) — query keys and mutations per module, colocated with each view (e.g. `modules/inventory/DevicesView.tsx`).
- **Client/UI state:** local `useState`/`useReducer`, no global client-state library (no Redux/Zustand).
- **Auth state:** `AuthProvider` context, backed by tokens from `frontend/src/lib/api.ts`.

## Forms & validation

No form library (Formik / React Hook Form) is used — forms use local `useState` validation, consistent with pre-existing patterns per the migration report. This is more verbose than a schema-based approach but was a deliberate choice to avoid introducing a new dependency mid-migration. See [Technical Debt](../development/Technical Debt.md).

## API integration

`frontend/src/lib/api.ts` — the single API client (also `types.ts` for shared TS types, `docs.ts`/`markdown.ts` for the in-app documentation viewer). Bearer tokens attached per [Authentication](../security/Authentication Overview.md); base URL from `NEXT_PUBLIC_API_URL`.

## UI patterns

MUI 5 (`@mui/material`, `@mui/x-data-grid`, `@mui/x-tree-view`, `@mui/lab`) with the Vuexy visual theme, Tabler icons (`@tabler/icons-react`) plus Iconify (`@iconify/react`), ApexCharts for dashboard visualizations. `@mui/x-tree-view` is pinned to v6.17's older `TreeView`/`nodeId` API (not the newer `SimpleTreeView`/`itemId`), noted as a future upgrade cost in the migration report — see [Technical Debt](../development/Technical Debt.md).

## Build output

`frontend/out/` is a generated static export (`next build`, `output: 'export'`) — not committed to git, produced by `make build`. See [Air-Gap Deployment#Repository vs. release artifact](../deployment/Air-Gap Deployment.md) for why.

## See also

[Feature - Dashboard](../reference/features/Feature - Dashboard.md) · [Feature - Inventory Management](../reference/features/Feature - Inventory Management.md) · [Technical Debt](../development/Technical Debt.md) · [Code Quality Report](../development/Code Quality Report.md)
