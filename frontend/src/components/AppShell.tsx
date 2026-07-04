// This file is deprecated and unused.
//
// The legacy hand-rolled app shell (sidebar/topbar/dark-mode toggle built
// from plain CSS + inline SVGs) was replaced by the Vuexy/MUI shell during
// the frontend migration. It now lives at:
//
//   src/layouts/AppLayout.tsx        (shell composition)
//   src/layouts/components/Sidebar.tsx
//   src/layouts/components/Navbar.tsx
//   src/layouts/components/UserMenu.tsx
//   src/layouts/components/Breadcrumbs.tsx
//   src/layouts/components/Footer.tsx
//   src/layouts/navConfig.tsx        (nav items, permissions, page titles)
//
// src/app/(app)/layout.tsx now imports AppLayout from '@/layouts/AppLayout'
// instead of this file. Nothing in the codebase imports from here anymore.
//
// The sandbox environment this migration ran in could not delete files from
// the connected project folder (the mount rejects unlink), so this file was
// emptied out rather than removed. Please delete
// frontend/src/components/AppShell.tsx by hand -- it is intentionally left
// with no exports so any accidental leftover import fails the build loudly
// instead of silently reintroducing the old UI.
export {}
