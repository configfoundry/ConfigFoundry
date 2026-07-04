// Deprecated, unused. This was the hand-built MUI Drawer sidebar (own nav
// rendering/collapse/permission-filter logic) from the "recreate Vuexy
// visually" pass. Replaced by Vuexy's ACTUAL vertical nav system, ported
// into @core/layouts/components/vertical/navigation/* -- Drawer, VerticalNavItems,
// VerticalNavGroup, VerticalNavLink, VerticalNavHeader, VerticalNavSectionTitle,
// all real vendor files (adapted only for next/navigation instead of
// next/router, and with ACL/i18n wrapper components removed since
// ConfigFoundry doesn't use CASL or i18n -- permission filtering happens in
// navigation/vertical/index.ts's buildNavigation() instead).
// No remaining imports reference this file (verified by grep before this
// stub was written). This sandbox could not delete files from the connected
// project folder (the mount rejects unlink) -- please delete this file by
// hand.
export {}
