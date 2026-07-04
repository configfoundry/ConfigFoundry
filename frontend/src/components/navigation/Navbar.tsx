// Deprecated, unused. This was the hand-built MUI AppBar (own dark-mode
// toggle, notifications popover, breadcrumbs slot) from the "recreate Vuexy
// visually" pass. Replaced by Vuexy's ACTUAL vertical AppBar, ported into
// @core/layouts/components/vertical/appBar/index.tsx, with content supplied by
// layouts/components/vertical/AppBarContent.tsx (ModeToggler + Breadcrumbs +
// UserDropdown -- the fake notifications popover was dropped, it had no real
// backend behind it).
// No remaining imports reference this file (verified by grep before this
// stub was written). This sandbox could not delete files from the connected
// project folder (the mount rejects unlink) -- please delete this file by
// hand.
export {}
