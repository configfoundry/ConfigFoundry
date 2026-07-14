# ConfigFoundry UI/UX Audit Report

**Date:** July 7, 2026
**Scope:** Full application walkthrough (Login → Dashboard → Inventory → Validation → Configuration → Administration → System → Account → Documentation), conducted live against a running instance with real data (948 devices, 1,709 bandwidth rows, 9 generated configurations) plus source-level review of every module.
**Method:** Live browser testing (Claude in Chrome) cross-referenced against the Vuexy React/Next.js reference template, backed by direct source inspection of the frontend codebase.

A note on honesty, since this report is only useful if it's accurate: every finding below is either something directly observed in the running app this session, or a specific line of source code cited by file path. Where a page could not be fully live-verified (some System sub-pages, some Account sub-pages, exhaustive mobile-breakpoint testing, full keyboard-only navigation, screen-reader testing), that is stated explicitly rather than implied. Nothing here is a guess dressed up as a finding.

---

## 1. Executive Summary

| Dimension | Score | Rationale |
|---|---|---|
| **UI** | 7.5 / 10 | Strong, consistent use of real Vuexy components (Cards, DataGrid, Timeline, Stepper, CustomChip/CustomAvatar) throughout. Docked for redundant widgets found on the Dashboard (now fixed), raw/unformatted data in audit surfaces (now fixed), and uneven density across a handful of System scaffold pages. |
| **UX** | 7 / 10 | The core workflow (Inventory → Validate → Generate → Export) is genuinely well designed — a real 3-step stepper that drives content, an honest empty-state pattern, single primary actions per page. Meaningfully docked for two structural issues found this session: Import was completely unreachable from a genuinely empty inventory list (fixed), and sidebar active-state highlighting was silently broken app-wide until this session (fixed) — both are the kind of gap a first-time user hits immediately. |
| **Enterprise Readiness** | 6.5 / 10 | The product is honest about what's real vs. scaffolded (TODO banners on unbuilt System pages are a good practice, not a bad look), and the validation/generation workflow holds up against real inventory at scale (948 devices). Held back by validation results being session-memory-only (a page refresh loses "944 warnings" context entirely) and by roughly half of System's sub-pages still being non-functional scaffolds. |
| **Vuexy Fidelity** | 8.5 / 10 | Layout, theming (incl. live dark-mode toggle), typography, and component usage are a faithful, real port — not a visual approximation. The one significant fidelity gap found (nav active-state never rendering) is now fixed and verified pixel-for-pixel against the vendor's gradient active-pill treatment. |
| **Product Polish** | 7 / 10 | Meaningfully improved this session: the Dashboard went from a generic analytics-template feel to an operations-first overview; audit/activity surfaces went from raw JSON and literal "unknown" strings to plain English. What's left standing between this and a 9-10: finishing the System scaffold pages, a dedicated pass on CRUD-table consistency across all 10 list views, and persisting validation state server-side. |

**Overall read:** this is no longer "a migrated app" — the core workflow pages (Dashboard, Configuration, Findings) would hold up next to a real enterprise ops tool. The remaining gap to "confidently compare against Datadog/Grafana/Azure Portal" is concentrated in a few specific, listed places below, not spread evenly across the whole product.

---

## 2. Module-by-Module Review

### Dashboard
- **Strengths:** Redesigned this session into an operations-first overview: a 5-tile KPI rail (Devices/Bandwidth Rows/Subnets/Configs Generated/Validation Passing) answers "how many / is it healthy" in under a second; Inventory Health and Devices-by-Config-Type sit side by side with no dead whitespace; Recent Activity now reads in plain English ("Signed In" / "You" / "Imported Devices") instead of raw action strings and UUIDs.
- **Weaknesses:** Two redundant widgets (Inventory Overview, and a separate Device Health card that disagreed with Validation Health's numbers) existed prior to this session and have been removed/merged.
- **UX issues:** None outstanding after this session's fixes. One residual limitation, inherent to the backend rather than the UI: the "Validation Passing" KPI reflects a client-side recomputation from current inventory, not a persisted validation run — it will differ from whatever the user saw the last time they clicked "Run Validation" if inventory changed in between. This is accurate behavior, but worth a tooltip explaining it's a live recalculation, not "the last run's result."
- **UI issues:** None found live.
- **Accessibility:** KPI tiles are `CardActionArea` wrapped in real `<Link>`s (keyboard-reachable, correct semantics). Radial/bar charts (ApexCharts) render as `<canvas>`/SVG with no textual data-table fallback — screen reader users get the surrounding card title/subheader but not the numbers inside the chart itself. Recommend adding `aria-label` summaries to the two chart cards.
- **Responsiveness:** Grid breakpoints (`xs/sm/lg`) are in place and were code-reviewed; full mobile-viewport visual verification was not completed this session (see §9).
- **Recommended improvements:** Add the "why does this differ from my last Run Validation" tooltip; add chart `aria-label`s.

### Inventory (Devices / Bandwidth Profiles / Subnets / Templates)
- **Strengths:** DataGrid-based list views with consistent toolbar (search, columns, filters, density, export), real bulk actions, per-row menus, and a genuinely useful Device Details page (tabbed: Overview/Audit History/Dynamic Tags/SNMP Configuration). Findings from Run Validation cross-link cleanly back into these views.
- **Weaknesses / bugs found and fixed this session:** The empty-state on all three of Devices, Bandwidth Profiles, and Subnets offered only an "Add X" button — the "Import from Excel" action and its dialog only existed in the *non-empty* code branch, so import was completely unreachable the moment a list hit zero rows. This is exactly the state every new customer starts in, and exactly what the Dashboard's onboarding checklist promises ("Add devices manually or import a spreadsheet"). Fixed on all three views; live-verified the Import dialog now opens correctly from a genuinely empty Subnets list.
- **UX issues:** Templates has no backend yet (honestly labeled "This section is ready to go as soon as a templates backend exists" — good practice, not a defect).
- **UI issues:** None found live at current scale (948 rows renders smoothly).
- **Accessibility:** DataGrid provides standard keyboard nav (arrow keys, tab-to-toolbar) out of the box via MUI X; not separately audited for custom row-action menus.
- **Responsiveness:** Toolbar wraps at narrow widths per MUI X's default behavior; not verified below ~1024px this session.
- **Recommended improvements:** None outstanding beyond the import fix already shipped. A CRUD-table consistency pass (toolbar, empty/loading states, row actions) across all 10 list views in the app (Devices/Bandwidth/Subnets/Templates/Users/Roles/API Keys/Audit Logs/Validation Findings/History) is still open as a dedicated task — see §10.

### Validation
- **Strengths:** Run Validation → Findings is a genuinely strong pair of pages. Findings groups real rule violations (`DEVICE_INVALID_IP`, `DEVICE_NO_REGION`, `DEVICE_DUPLICATE_HOSTNAME`, `DEVICE_MISSING_CREDS`, `BW_DUPLICATE_INTERFACE`, `BW_ORPHANED`) into filterable categories (All/Errors/Warnings/Suggestions/Duplicate Devices/Bandwidth Issues) with real device names and IPs inline and a "View details" link per finding — this reads like real network-ops tooling, not a placeholder.
- **Weaknesses:** Validation results are session-memory only (`useValidationResult`, an in-memory React Query cache entry, not persisted to the backend). A hard page reload — or simply navigating in by URL rather than by clicking through — resets Findings/Run Validation back to "no validation run yet" even seconds after a real run. Live-confirmed this repeatedly this session.
- **UX issues:** The above means a user can't share a link to "here's what Validation found" with a teammate, and a browser refresh silently discards the context. This is the single most consequential structural gap in the Validation module.
- **UI issues:** None found.
- **Accessibility:** Filter chips are real MUI `Chip`/`ToggleButton`-style controls, keyboard reachable.
- **Recommended improvements:** Persist the last validation run server-side (even just the summary + finding list, keyed by org) so Findings survives a refresh and can be deep-linked. This is a backend change, not just a frontend one.

### Configuration
- **Strengths:** The flagship redesign of the whole engagement — a real, functional 3-step `Stepper` (Review Inventory → Generate Configuration → Export) that actually drives page content via `activeStep`, not a decorative header. Each step has exactly one primary action, honest labeling ("Download All" instead of implying a ZIP that doesn't exist), and "Deploy" is disabled with an explanatory tooltip rather than silently doing nothing. Live-tested the full flow end-to-end against real inventory (948 devices → real generate call → real file list).
- **Weaknesses:** "Download All" was clickable even when 0 files were produced (fixed this session — now disabled with a tooltip explaining why).
- **UX issues:** None outstanding.
- **UI issues:** None found live.
- **Recommended improvements:** None outstanding.

### Administration (Users / Roles / API Keys / Audit Logs)
- **Strengths:** All four are real, working DataGrid-backed pages with genuine data (5 real roles with descriptions and permission counts, a real revoked API key, real audit history). Audit Logs offers both a Table and a Timeline view of the same feed, which is a nice touch for different investigative styles.
- **Weaknesses / bugs found and fixed this session:** Audit Logs (and the Dashboard's Recent Activity, which reads the same feed) rendered the literal string `"unknown"` for system-triggered actions, raw UUIDs for user-triggered ones, raw `{"summary":"..."}` JSON blobs in the Details column, and snake_case/dotted raw action strings (`import_devices`, `auth.login`). All four fixed via a shared `lib/auditFormat.ts` helper — Actor now reads "System"/"You"/a shortened id, Action reads "Imported Devices"/"Signed In", and Details reads as plain text.
- **UX issues:** None outstanding after the above fix.
- **Recommended improvements:** If/when the backend gains a users-list-accessible-to-all-roles, resolving other users' UUIDs to names (not just "is this me") would close the last gap in Actor readability.

### System
- **Strengths:** The pages checked live (Global Settings, Database, Authentication) are well-organized, honestly labeled scaffolds — each carries a clear "Not connected -- TODO: GET/PUT /api/v1/system/..." banner rather than pretending to be functional, with sensibly grouped form sections (Connection/Maintenance for Database; Session/MFA/Password Policy for Authentication) and a single Save action per page.
- **Weaknesses:** Storage, SMTP, Integrations, Licensing, Backup & Restore, and Security Policies were not re-verified live this session (they use the same shared scaffold component reviewed in a prior session pass, so risk is low, but this is a code-review-confidence claim, not a fresh live-verified one).
- **Recommended improvements:** As real backend endpoints land for each of these, replace the TODO banners one at a time — the UI shell is already in a good state to receive that.

### Account
- **Strengths:** Profile (real password-change flow, correct "Change required" password-status chip), Theme (the full Vuexy Customizer exposed as a real page — Mode/Skin/Primary Color/Content Width/AppBar Type, live-tested dark mode end-to-end), and Sessions (a real, functional table of active sessions with per-row Revoke) are all genuinely working, not scaffolds.
- **Weaknesses:** Notifications is an honest TODO scaffold, but its toggle switches render visually "on" despite the page's own "Not yet connected" banner — a user could reasonably believe flipping them does something. Recommend either disabling the switches or adding inline "(not yet functional)" microcopy next to each.
- **UX issues:** Sessions has no bulk "Revoke all other sessions" action, which is a common real-world need (e.g., after a shared/public-computer login) and the one thing missing from an otherwise complete page.
- **Recommended improvements:** Disable or annotate the Notifications toggles; add bulk session revocation.

### Documentation
- **Strengths:** Comprehensive (28 pages, versioned, includes Air-Gap Deployment, full API Reference, Authentication/Security, Configuration Reference), keyboard-accessible search (`⌘K`), a working dark-mode toggle, and a genuine content-organization scheme (Getting Started / Air-Gap & Enterprise / Architecture & API / Access Control).
- **Weaknesses / design-consistency observation:** This module is a visually distinct micro-site — its own top bar/logo/search, no Vuexy sidebar or breadcrumb, no shared PageHeader pattern with the rest of the app. This is a common, legitimate pattern for product documentation (many enterprise SaaS products separate docs visually from the app shell), but it's worth naming explicitly: a user moving from the app into Docs experiences a full context switch, softened only by a persistent "Open app" button to return. Whether this is the right call is a product decision, not an obvious defect — flagging it rather than "fixing" it unprompted.
- **Recommended improvements:** If unifying the visual language is desired, the minimum viable version would be reusing the same top AppBar (theme toggle, avatar, notifications) rather than the docs site's own header — the search/content layout can reasonably stay distinct.

---

## 3. Navigation Audit

- **Information architecture:** The 8-group hierarchy (Overview/Inventory/Validation/Configuration/Administration/System/Account/Resources) matches the requested target IA and reads cleanly; no orphaned or unreachable routes were found.
- **Sidebar:** Visually faithful to the Vuexy vendor layout (width, section-label typography/spacing, icon weight, submenu indentation, chevron rotation, collapsed-mode icon rail, hover-expand overlay behavior) — all directly compared against rendered output this session, not just source diffs.
- **Breadcrumbs:** Present and consistent on every page checked (`Home > Section > Page`), correctly reflecting the current route.
- **Page titles:** Every module uses the shared `PageHeader` component (title + one-line description), consistent across all pages checked.
- **Redundant navigation:** The in-page tab-strip duplication flagged in an earlier pass of this engagement has been removed everywhere; not re-found this session.
- **Workflow clarity:** Inventory → Validation → Configuration reads as a natural sequence; Quick Actions on the Dashboard and the Configuration stepper both reinforce "what's next."
- **Navigation discoverability:** **Critical finding, fixed this session:** the active-nav-item highlight (the gradient "pill" that shows which page you're currently on) never rendered for any leaf item, on any route, for the entire application, because of a trailing-slash mismatch between the static-export URLs (`/inventory/devices/`) and the nav config's `href` values (`/inventory/devices`) in `VerticalNavLink.tsx`'s exact-match check. A user had zero visual confirmation of their current location within an expanded sidebar group. Fixed by normalizing trailing slashes before comparison; live-verified the correct Vuexy gradient pill now renders on multiple routes, in both expanded and collapsed nav modes.

---

## 4. Dashboard Audit

- **Visual hierarchy:** Now KPI row (highest-level facts) → health/summary panels (one level of detail down) → activity/actions (operational, most granular) — a clear top-to-bottom hierarchy that didn't exist in the prior 3-uneven-cards layout.
- **Information density:** Meaningfully improved: 5 KPI tiles fit one row that previously held 2 uneven cards with significant dead whitespace beneath the shorter one.
- **Card sizing:** Now consistent height within each row (`alignItems="stretch"`), eliminating the previous jagged-bottom-edge look.
- **Spacing:** Consistent `spacing={6}` grid gutters throughout, matching the rest of the app.
- **Widgets:** Reduced from 9 (5 analytics-style cards + Recent Activity + Quick Actions + Recent Imports + Recent Exports) to 5 (KPI row + Inventory Health + Inventory Summary + Recent Activity + Quick Actions) by removing genuine duplicates, not by deleting functionality — every real fact previously shown is still shown, just once.
- **Charts:** The radial validation-status chart and the config-type bar chart are both real-data-driven (no fabricated trend lines); a config-type chart with true 0 counts shows an honest "no devices yet" message rather than an empty axis.
- **Primary actions:** Each KPI tile is itself a clickable link to its detail page; Quick Actions gives four explicit, distinctly-labeled next steps (Generate / Manage / Run / View).
- **Onboarding:** The zero-inventory checklist (Welcome to ConfigFoundry) correctly derives real completion state (Import Inventory / Configure Templates / Run Validation / Generate Configuration) from live data rather than being static.
- **Operational usefulness:** With real data, the Dashboard now directly answers all six questions the redesign brief asked for (device count, inventory health, validation status, configs generated, recent activity, next action) without scrolling.

---

## 5. Component Audit

| Component | Consistency | Notes |
|---|---|---|
| Buttons | Good | Single primary action per page is the enforced pattern; secondary/tonal/outlined used consistently for lesser actions. |
| Cards | Good | Consistent `CardHeader`/`CardContent`/`Divider` structure app-wide. |
| Tables (DataGrid) | Good, not yet exhaustively cross-checked | Toolbar (search/columns/filters/density/export) pattern is consistent everywhere it's used; a dedicated side-by-side pass across all 10 list views is still open (see §10). |
| Forms | Good | Section-grouped fields with a single Save action (System scaffolds, Profile) is a consistent, sensible pattern. |
| Dialogs | Good | Import dialogs (file picker + Merge/Replace mode) are consistent across Devices/Bandwidth/Subnets. |
| Steppers | Excellent | Configuration's 3-step stepper is the strongest single UI element in the app — real state-driven, not decorative. |
| Tabs | Good | Used appropriately for genuinely-different-but-related content (Global Settings' Tag Definitions/Managed Lists; Device Details' Overview/Audit History/Dynamic Tags/SNMP Configuration) rather than as a workaround for missing navigation. |
| Badges/Chips | Good, one fix applied | Status chips (Configured/Needs Attention, Passed/Warnings/Failed) use correct semantic color; the Dashboard's device-count label was previously colored red/error alongside a 0% health stat, misleadingly implying the device *count* was an error rather than the pass rate — fixed to keep counts neutral and only color the actual status. |
| Alerts | Good | Error states (failed queries) consistently use `Alert severity="error"` with a Retry action. |
| Snackbars/Toasts | Not fully re-verified this session | An earlier pass flagged the toast system as still using legacy CSS classes rather than MUI Snackbar in some places; the Configuration generate flow was observed using a real MUI-styled toast this session, but a full snackbar consistency pass across the whole app wasn't repeated. |
| Menus/Dropdowns | Good | `OptionsMenu` (kebab menu) pattern consistent on Dashboard cards; row-action menus consistent in DataGrids. |
| Icons | Good | Tabler icon set used consistently, correct sizing convention (1.375rem standalone, smaller nested-in-avatar). |
| Loading states | Good | `Skeleton` used consistently for cards/tables/charts during fetch. |
| Empty states | Good, one significant bug fixed | Onboarding-style empty states (icon + title + description + primary + secondary action) are the established, consistent pattern — but the primary/secondary action pairing was missing entirely from three Inventory list views' empty states (Import was unreachable), now fixed. |
| Error states | Good | Consistent `Alert` + Retry pattern on query failures across Dashboard, Audit Logs, Generation History. |

---

## 6. Enterprise UX Audit

- **Enterprise IT / Network Engineers:** The Findings page (real rule codes, real IPs/hostnames, filterable by category) and Device Details (SNMP Configuration tab, Dynamic Tags, Audit History) both speak directly to this audience's actual workflow — this is the strongest part of the product for this persona.
- **DevOps Teams:** The Configuration stepper and generation history give a clear, auditable "what was generated, when, by whom" trail suitable for change-tracking; API Keys and Audit Logs support programmatic/CI-adjacent workflows.
- **NOC Teams:** The Dashboard's KPI row plus Inventory Health panel now gives the "is everything okay" at-a-glance view a NOC screen needs; the non-persistent validation state (§2, Validation) is the main gap for this persona specifically, since a shared/refreshed NOC dashboard would lose validation context.
- **Security Teams:** Audit Logs (with real actor/action/entity/details, both table and timeline views), Sessions (with per-session revoke), API Keys (with revocation status), and MFA settings all directly support this persona. The Sessions page's missing bulk-revoke is the one gap.
- **Operations Teams:** Administration's Users/Roles pages give clear permission-set descriptions ("Read-only access plus the audit log", "Day-to-day work: edit inventory, generate configs, export data. No user/role/policy management") that make role assignment self-explanatory without external documentation.

---

## 7. Design Consistency

- **Spacing:** Consistent `spacing={6}` grid gutters and card padding conventions app-wide; the Dashboard rebuild specifically fixed a prior inconsistency where card heights varied within the same row.
- **Typography:** Consistent use of the shared `PageHeader` (title/description) pattern; heading-weight hierarchy (h3/h4/h5/h6) used consistently within cards.
- **Colors:** One real inconsistency found and fixed — semantic color (red/green/orange) was being applied to a raw count (device total) rather than reserved strictly for status/health indicators. Now consistent: counts are neutral, only status carries color.
- **Alignment:** No misalignment found in reviewed pages; DataGrid columns, card headers, and button placement are consistent.
- **Shadows/Elevation:** Standard MUI `Card` elevation used consistently; no bespoke/conflicting shadow styles found.
- **Animations:** Chevron rotation on sidebar group expand/collapse, hover-expand overlay transition, and stepper transitions all behave consistently with Vuexy's vendor timing.
- **Responsive behavior:** Grid breakpoints are consistently authored (`xs/sm/lg` or `xs/sm/md`) across every module reviewed at the source level; live verification was completed at desktop widths only this session (see §9).

---

## 8. Accessibility Audit

- **Keyboard navigation:** Sidebar links, KPI tiles, and Quick Actions are all real `<Link>`/`ListItemButton` elements (tab-reachable, Enter-activatable) by construction — not custom `<div onClick>` patterns. Not exhaustively tested with keyboard-only navigation end-to-end this session.
- **ARIA:** Icon-only buttons (kebab menus, theme toggle) generally rely on MUI's built-in `IconButton` semantics; the two Dashboard charts (radial validation status, config-type bar chart) have no explicit `aria-label` summarizing their data for screen readers — recommended fix in §2 (Dashboard).
- **Contrast:** Vuexy's theme palette is WCAG-conscious by design (text.secondary/text.disabled tiers exist specifically for this); no contrast failures were visually apparent in either light or dark mode during this session's testing.
- **Focus management:** Dialogs (Import, Confirm) use standard MUI `Dialog` focus-trap behavior by default; not independently re-verified this session.
- **Screen reader compatibility:** Not tested this session with an actual screen reader (VoiceOver/NVDA). This is the single largest accessibility gap in this audit's coverage and should be a follow-up pass before claiming full accessibility compliance.

---

## 9. Performance Opportunities

- **Component rendering:** `InventoryHealthPanel` and `DashboardKpiRow` both recompute their classification (`validationStatus()`) from the full `devices` array on every render; at 948 devices this is fast (confirmed live, no jank), but this should be memoized (`useMemo`) if device counts grow into the tens of thousands.
- **Lazy loading:** The Mermaid diagram renderer in Documentation (`DocsContent.tsx`) already lazy-loads via a runtime `import()` rather than a static one specifically so it doesn't inflate the main bundle when unused — a good existing pattern worth replicating for other optional/heavy dependencies if any are added later.
- **Virtualization:** MUI X DataGrid provides row virtualization by default; confirmed the Devices grid (948 rows) scrolled smoothly with no visible lag.
- **Code splitting:** Next.js App Router provides per-route code splitting automatically; no manual `dynamic()` splitting was observed being misused or missing anywhere that would matter.
- **Bundle optimization:** Not specifically profiled this session (no production build was run — see §10, "Known Limitations"). Recommend running `next build` with the bundle analyzer before a real release to catch any accidentally-large dependencies.

---

## 10. Prioritized Action Plan

### Critical (fixed this session)
| Issue | Impact | Recommendation | Effort |
|---|---|---|---|
| Sidebar active-nav-item highlight never rendered (trailing-slash mismatch) | Users had zero visual confirmation of current location app-wide | Normalize trailing slashes before comparing `pathname`/`item.path` | Small — **done** |
| Import unreachable from empty Devices/Bandwidth/Subnets lists | New customers (the exact zero-inventory state every install starts in) could not import a spreadsheet at all | Add Import action + dialog to each empty state | Small — **done** |
| `@mui/x-data-grid` and nested `react-is` node_modules corruption | Blocked the entire dev server / every DataGrid page | User ran a clean `npm install` | External — **resolved** |

### High (fixed this session)
| Issue | Impact | Recommendation | Effort |
|---|---|---|---|
| Audit Logs / Recent Activity showed raw "unknown", UUIDs, and JSON blobs | Unprofessional, hard to scan for a real admin | Shared `formatActor`/`formatAction`/`formatDetails` helpers | Small — **done** |
| Dashboard had 3 separate widgets reading the same `/history` feed; Device Health and Validation Health disagreed on numbers | Redundant, confusing, undermined trust in the numbers | Removed duplicates, merged into one consistent classification | Medium — **done** |
| Device-count label colored red next to a low pass-rate % | Implied the device count itself was an error | Keep counts neutral, only color actual status | Small — **done** |

### Medium (open)
| Issue | Impact | Recommendation | Effort |
|---|---|---|---|
| Validation results are session-memory-only | Refresh/deep-link loses "N warnings" context entirely | Persist last validation run summary server-side | Medium (needs a backend endpoint) |
| Notifications page toggles appear "on" despite disconnected backend | Could mislead a user into thinking they've configured something real | Disable switches or add inline "(not yet functional)" microcopy | Small |
| Sessions page has no bulk "Revoke all other sessions" | Common real-world security need is one extra click away from possible | Add a single bulk-revoke button | Small |
| Dedicated CRUD-table consistency pass not yet done | Some inconsistency risk across the 10 list views not yet confirmed | Side-by-side review of toolbar/empty/loading/row-action patterns across all 10 | Medium |
| Remaining System scaffold pages (Storage/SMTP/Integrations/Licensing/Backup/Security Policies) not re-verified live this session | Lower confidence than a fresh live check | Live spot-check each; low risk since they share one reviewed component | Small |

### Low (open)
| Issue | Impact | Recommendation | Effort |
|---|---|---|---|
| Documentation is a visually distinct micro-site (no shared app shell) | Full context switch when navigating from app → docs | Consider reusing the shared top AppBar; docs' own content layout can reasonably stay distinct | Medium (product decision first) |
| Charts (radial validation status, config-type bar) have no `aria-label` | Screen reader users get the card title but not the data | Add data-summarizing `aria-label`s | Small |
| Full accessibility pass (keyboard-only, screen reader) not completed | Unknown remaining gaps | Dedicated a11y audit session with real assistive tech | Medium |
| Mobile/narrow-viewport visual verification incomplete | Unknown remaining gaps below ~1024px | Dedicated responsive-breakpoint pass with real device emulation | Medium |
| Bundle-size profiling not done | Unknown | Run `next build` + bundle analyzer before release | Small |

---

## Known Limitations of This Audit

For full transparency: a real production build (`next build`) was not run to completion during this engagement (the sandboxed environment used for source-level work times out on cold builds); all live verification was done against the Next.js dev server. Mobile/narrow-viewport rendering, keyboard-only navigation, and screen-reader compatibility were reviewed at the source level but not exhaustively live-tested. These are called out explicitly in §8–9 and the action plan above rather than silently assumed to be fine.
