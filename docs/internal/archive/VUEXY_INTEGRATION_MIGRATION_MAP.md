# Vuexy → ConfigFoundry Integration Migration Map

Scope of this document: research only, per your instruction. No code has been touched. This replaces the earlier "rebuild Vuexy visually" approach — the finding below changes the plan materially, so read the Compatibility Issues section before anything else.

## 1. What's actually in your licensed bundle

Your project folder contains the real, licensed Vuexy package at `theme/react-version/nextjs-mui/{typescript-version,javascript-version}/{full-version,starter-kit}`. I inspected the TypeScript full-version directly.

Key facts, confirmed by reading `package.json` and the source tree:

- Next.js **13.3.2**, React 18.2.0, MUI 5.12.2, `@mui/x-data-grid` 6.0.3
- **Pages Router** — `src/pages/_app.tsx`, `src/pages/**`, paired with `src/views/**` for the actual page content
- No NextAuth, no Prisma, no Tailwind, no `[lang]` i18n folder, no Redux Toolkit
- Auth pages use a plain `useAuth()` hook + `react-hook-form` + `yup` — not tied to any specific backend, genuinely portable
- Contains the demo pages you'd expect: CRM/eCommerce/Analytics dashboards, Calendar, Chat, Email, Invoice, Kanban references, plus the reusable ones: `pages/apps/user/list`, `pages/apps/roles`, `pages/apps/permissions`, `pages/tables/data-grid`, `pages/components/timeline`, `pages/components/tree-view`, `pages/pages/account-settings`, and ~14 auth page variants under `pages/pages/auth/*` (login-v1/v2, register, forgot/reset-password-v1/v2, two-steps-v1/v2, verify-email-v1/v2)

I confirmed via `changelog.html` (bundled) that Vuexy's Next.js/MUI line was first released at **v9.4.0 (2023-01-10)** as a Pages-Router product, and the changelog file in your bundle stops at **v9.9.0 (2023-10-17)**. That's what you have.

## 2. What the vendor ships today (checked live, July 2026)

I checked ThemeSelection/PixInvent's current demo and docs site. There are two distinct live products:

- `demos.pixinvent.com/vuexy-nextjs-admin-template-old/` — the Pages Router version (matches what's in your `theme/` folder)
- `demos.pixinvent.com/vuexy-nextjs-admin-template/` — the **current** version, and it is **App Router**

The current version's folder structure (from their docs):

```
src/
  @core/        -> template core (not meant to be edited)
  @layouts/     -> Vertical/Horizontal/Blank layout internals (not meant to be edited)
  @menu/        -> menu system internals (not meant to be edited)
  app/
    [lang]/
      (blank-layout-pages)/   -> login, auth pages etc.
      (dashboard)/            -> main app pages
      [...not-found]/
      layout.tsx
    api/                      -> Route Handlers
  components/   -> your customizations go here
  libs/auth.ts  -> NextAuth.js setup
  prisma/       -> Prisma schema + SQLite dev.db
  redux-store/
  views/        -> page content rendered by app/
```

This is a materially different product: Tailwind CSS added alongside MUI, NextAuth.js as the built-in auth layer (Credentials or Google+Prisma providers), Prisma as the default persistence layer, Redux Toolkit for client state, and an i18n `[lang]` segment wrapping every route.

**You do not currently have this version.** It isn't sitting anywhere in your project folder — I checked. If your ThemeSelection/Envato license includes free updates, it's a separate download from your account, not something already present locally.

## 3. Current ConfigFoundry frontend architecture (for reference)

- Next.js 14.2.33, App Router (`src/app/(app)`, `src/app/(auth)`), React 18.3.1, MUI 5.16.14
- Custom `AuthProvider` + JWT-based login/MFA calling your FastAPI backend directly (no NextAuth)
- `@tanstack/react-query` v4 for all data fetching
- Already has a hand-built Vuexy-styled theme/layout/shell from the prior session's work (`src/theme`, `src/layouts/AppLayout.tsx`, `src/components/navigation/*`, etc.) — visually approximating Vuexy but written from scratch, which is exactly what you flagged as wrong

## 4. Compatibility issues (the decision this map exists to surface)

1. **Router mismatch, either direction.** The bundle you have is Pages Router; the vendor's current App-Router product is a different download you don't yet have. Neither one is "drop Vuexy's `pages/` folder into your `app/` folder" — the routing models are fundamentally different (file conventions, data fetching, layouts, middleware).
2. **Auth architecture mismatch (current version only).** If you obtain the new App-Router bundle, its auth pages are wired to NextAuth.js (Credentials/Google/Prisma). Your backend is a custom FastAPI JWT API. NextAuth's Credentials Provider *can* wrap a custom backend, but that's an integration task, not a copy-paste — the login/2FA/session logic in `libs/auth.ts` would need real rework, which brushes against your "never rewrite auth logic" rule.
3. **The old bundle (Pages Router) has no such conflict** — its `useAuth()` hook is generic and already close to what was ported into `LoginView.tsx` in the earlier session. But adopting it means either running two routers side-by-side (not supported in one Next.js app) or converting the entire app from App Router to Pages Router.
4. **"@core/@layouts/@menu are not meant to be modified"** is the vendor's own guidance in both versions — meaning literal reuse means importing those folders wholesale and only touching `components/`, `views/`, and route files. That's consistent with what you asked for, but it means a large volume of vendor code (contexts, hooks, SVGs, menu system) lands in your repo verbatim, including code paths for demo features (e-commerce cart, chat, calendar) baked into shared context/providers that aren't trivially separable from the parts you want (theme, layout, nav, cards, tables).
5. **Version drift.** Whichever bundle you use, its MUI/Next/TypeScript pins are older or differently-configured than your current `package.json`. Merging dependency trees (react-hook-form + yup aren't currently in your frontend; Tailwind isn't either, if you go with the new version) needs to be resolved before any page-level work starts.

## 5. Recommended path

Given "preserve App Router, maximize reuse, don't rewrite backend or business logic," the only option that doesn't force a framework downgrade is:

**Get the current App-Router Vuexy bundle from your ThemeSelection/Envato account, then integrate it as follows:**

1. Pull in `src/@core`, `src/@layouts`, `src/@menu` from the new bundle verbatim (per vendor's own instructions, these are meant to be dropped in unmodified and updated wholesale on future Vuexy releases).
2. Adopt their `app/[lang]/(dashboard)` and `(blank-layout-pages)` route group structure as the shell your existing route files move into — this is a real restructuring of `src/app`, but it's a folder-organization change, not a rewrite of any page's logic.
3. Strip the NextAuth/Prisma/Redux scaffolding from `libs/auth.ts` and the `app/api/auth` routes, and wire the layout's session/user-menu hooks to your existing `AuthProvider` and FastAPI calls instead — this is the one place real adaptation (not copy-paste) is required, consistent with "replace only presentation" since the actual JWT/login logic in your `AuthProvider` doesn't change, only what feeds the layout's "who's logged in" display.
4. Remove demo apps/pages (CRM, eCommerce, Email, Chat, Calendar, Invoice, Academy/Logistics if present) and repurpose the reusable ones (`apps/user`, `apps/roles`, `apps/permissions` equivalents, account-settings, data-grid tables, timeline component) exactly as your original brief described.
5. Decide on Tailwind: the new bundle's `@core`/`@layouts` internals may depend on Tailwind utility classes alongside MUI `sx`. This needs a direct look at the actual downloaded bundle before committing — I can't verify this without the real files in hand.

If you don't have access to the new bundle (e.g., license doesn't include this major version, or it's not repurchased), the fallback is the old Pages-Router bundle you already have — but using it as "the foundation" means converting ConfigFoundry off App Router entirely, which is the one thing your instructions explicitly want to avoid. In that case the more honest recommendation is to keep App Router and continue porting Vuexy's actual `@core` component source (buttons, cards, text fields, icons) file-by-file into your existing structure, which is reuse of real Vuexy code without a router change — a middle path between "rebuild visually" (what happened before) and "swap the whole app to Pages Router."

## 6. Estimated effort

| Path | Effort | Notes |
|---|---|---|
| A. New App-Router bundle, full integration (steps 1–5 above) | 3–5 working days | Bulk of time is untangling NextAuth from `@core`/`@layouts` internals and reconciling two dependency trees; actual page work is fast once shell is in place |
| B. Old Pages-Router bundle, convert app to Pages Router | 1.5–2 weeks | Every route file, layout, and data-fetching pattern in the app changes; highest risk of touching things you said not to touch |
| C. Stay on App Router, port `@core` component source only (no route restructuring) | 2–3 working days | Lower fidelity to "recognizable as Vuexy" at the folder level, but zero router risk and fastest |

## 7. Risks

- I cannot fully scope Option A until the actual new-version bundle is in hand — the Tailwind question, exact `@core` API surface, and NextAuth removal steps all depend on files I haven't seen.
- Envato/ThemeSelection licenses are typically tied to a specific major version; confirm your license entitles you to the current major version download before assuming it's available.
- Any option touches `src/app` structure to some degree — even Option C reorganizes where component source lives. None of these change API contracts, auth logic, or business logic in the backend or `AuthProvider`/`lib/api.ts`.
- The build-verification limitation from the earlier session (native SWC binary crashes in this sandbox) still applies regardless of which path you pick.

## Next step

No code changes made. Tell me which path (A, B, or C) to proceed with, or upload/point me to the new App-Router Vuexy bundle if you have access to it and want Option A scoped precisely before starting.
