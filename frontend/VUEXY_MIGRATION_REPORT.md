# ConfigFoundry — Vuexy Migration & Cleanup Report

Date: 2026-07-04

## Verification status

- `npx tsc --noEmit` — clean, 0 errors
- `npm run lint` — clean, 0 warnings/errors
- `npm run build` — cannot complete in this sandbox. The native `@next/swc-linux-arm64-gnu` binary crashes with a Bus error (SIGBUS, exit 135) as soon as it's `require()`'d, reproduced identically on the connected project folder and after copying the project to plain ext4 storage. This is an environment issue, not a code issue — tsc and lint (which don't load native SWC in this config) both pass clean. Please run `npm run build` locally to get a final build confirmation; nothing in the diffs suggests it will fail.

## Folder structure (final)

```
src/
  app/
    (app)/            route group — dashboard, inventory, validation, generate,
                       history, settings, admin/{users,roles,policies,api-keys,audit-logs}
    (auth)/           login
    documentation/    docs pages (unmigrated, out of scope)
    layout.tsx, page.tsx, globals.css
  layouts/
    AppLayout.tsx     Vuexy shell (Sidebar + Navbar + Footer composition)
    navConfig.tsx     nav groups, page titles, drawer width
    components/       8 deprecated stub files (see "Could not delete" below)
  theme/
    index.ts, palette.ts   Vuexy tokens + MUI theme builder
  providers/
    AuthProvider, QueryProvider, ThemeModeProvider   (all pre-existing, untouched logic)
  components/
    common/       EmptyState, ConfirmDialog, FormDrawer, StatCard, StatusChip,
                   PermissionTree, MiniBarChart, Footer
    navigation/    Sidebar, Navbar, UserMenu, Breadcrumbs
    tables/        DataGridToolbar
    docs/          DocsShell, DocsContent, DocsSearch, KeyboardShortcutsModal (unmigrated, untouched)
    ui/            Toast, Modal, Spinner, ErrorBanner, EmptyState (still active, untouched)
                   Badge.tsx — stub (dead)
    AppShell.tsx, dashboard/StatCard.tsx — stubs (dead)
    testfile_delete_me.txt — debris, stubbed
  modules/
    auth/          LoginView
    inventory/     InventoryView, DevicesView, BandwidthView, SubnetsView,
                   ImportDialog, DeviceFormDrawer, BandwidthFormDrawer, SubnetFormDrawer
    validation/    ValidationView, FindingsTimeline, FindingDetailDialog, findingGroups.ts
    generate/      GenerateView, CodeViewer, DiffViewer, lineDiff.ts
    administration/ AdminTabs, UsersView, RolesView, ApiKeysView, PoliciesView, AuditLogsView
    dashboard/     DashboardView
  lib/
    api.ts, types.ts, docs.ts, markdown.ts   (pre-existing, untouched except additive `Finding.category?`)
```

Modules **not** migrated (out of scope, left on legacy CSS/plain HTML): History, Settings, Documentation. `globals.css` was kept (not removed) because these pages still depend on it; only confirmed-dead rule blocks were stripped.

## Components created

- `layouts/AppLayout.tsx`, `layouts/navConfig.tsx`
- `theme/index.ts`, `theme/palette.ts`
- `providers/ThemeModeProvider.tsx`
- `components/navigation/{Sidebar,Navbar,UserMenu,Breadcrumbs}.tsx`
- `components/common/{EmptyState,ConfirmDialog,FormDrawer,StatCard,StatusChip,PermissionTree,MiniBarChart,Footer}.tsx`
- `components/tables/DataGridToolbar.tsx`
- `modules/auth/LoginView.tsx`
- `modules/inventory/{InventoryView,DevicesView,BandwidthView,SubnetsView,ImportDialog,DeviceFormDrawer,BandwidthFormDrawer,SubnetFormDrawer}.tsx`
- `modules/validation/{ValidationView,FindingsTimeline,FindingDetailDialog,findingGroups.ts}`
- `modules/generate/{GenerateView,CodeViewer,DiffViewer,lineDiff.ts}`
- `modules/administration/{AdminTabs,UsersView,RolesView,ApiKeysView,PoliciesView,AuditLogsView}.tsx`
- `modules/dashboard/DashboardView.tsx`
- One new route: `/admin/audit-logs` (no backend endpoint added — reuses `api.getAudit`).

All API calls, query keys, mutations, and auth/redirect logic were ported unchanged from the pre-migration pages; only the presentation layer was replaced.

## Components removed (stubbed — see note below)

The connected project folder rejects file deletion (`rm` / `os.remove()` both return `PermissionError: Operation not permitted`). These 8 files are fully dead (zero remaining imports, verified by grep) and have been overwritten with `export {}` stubs plus a comment explaining why. **Please delete them by hand:**

- `components/AppShell.tsx`
- `components/dashboard/StatCard.tsx`
- `components/ui/Badge.tsx`
- `layouts/components/Sidebar.tsx`
- `layouts/components/Navbar.tsx`
- `layouts/components/UserMenu.tsx`
- `layouts/components/Breadcrumbs.tsx`
- `layouts/components/Footer.tsx`
- `components/testfile_delete_me.txt` (pre-existing debris, unrelated to migration, also stubbed)

CSS also cleaned: `.app-shell`, `.sidebar` (bare), `.sidebar-brand`, `.sidebar-nav`, `.nav-badge`, `.main-area`, `.topbar`+variants, `.content`, `.stat-grid`+`.stat-card*`, `.banner-info`, `.pagination`+`.page-info`, `.finding-row`+`.finding-message`+`.finding-device` were removed from `globals.css` after confirming no unmigrated page still references them. Classes still shared with Documentation (`.sidebar-brand-name`, `.nav-group-label`, `.nav-item`, `.sidebar-footer`) were kept.

## Technical debt remaining

- **Build verification gap**: `next build`/`next dev` could not be run to completion in this sandbox (SWC native binary crash). tsc + lint are clean, but a real local build is the only way to fully confirm.
- **8 stub files** listed above need manual deletion; they're harmless (no exports) but clutter the tree until removed.
- **History, Settings, Documentation** are still on the pre-Vuexy UI/plain CSS — out of scope per your module list, but they're the remaining visual inconsistency.
- **Missing backend features surfaced during migration, currently shown as honest placeholders rather than built:**
  - Forgot Password / Reset Password / Verify Email — no backend support; skipped per your instruction.
  - Tag-level validation checks — `core/validator.py` has no tag rules yet; Validation page shows a disabled "Not yet available" section.
  - Organizations admin page — no REST endpoint exists (`organization_service.py` has no router); skipped, not built.
  - Recent Imports on Dashboard — no audit trail for imports exists server-side; shown as an honest empty state rather than fabricated data.
- **`@mui/x-tree-view` is pinned to v6.17.0's older `TreeView`/`nodeId` API** (not the newer `SimpleTreeView`/`itemId`) — fine today, but an upgrade later will require touching `PermissionTree.tsx`.
- **No form library** (Formik/RHF) was introduced since neither was pre-existing; forms use local `useState` validation, consistent with existing patterns but more verbose than a schema-based approach.

## Suggested improvements

- Run `npm run build` locally and fix anything tsc/lint couldn't catch (React Server Component boundaries, `next.config.js` issues, etc.).
- Delete the 8 stub files and re-run `tsc`/`lint` to confirm nothing regresses.
- If tag-level validation or an Organizations page becomes a real backend feature, the frontend placeholders are already positioned to be filled in without further layout changes.
- Consider migrating History/Settings/Documentation to the same Vuexy shell for full visual consistency, when you're ready to greenlight those modules.
- Consider extracting shared Data Grid column/action patterns (currently repeated across Devices/Bandwidth/Subnets/Users/Roles) into a small generic wrapper if a further module needing a grid comes up — not done now to avoid speculative abstraction.
