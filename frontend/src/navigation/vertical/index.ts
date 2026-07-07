// ---------------------------------------------------------------------------
// Sidebar navigation data, shaped for Vuexy's VerticalNavItemsType.
//
// Full 3-tier enterprise IA. Vuexy's own nav engine (VerticalNavGroup ->
// VerticalNavItems -> VerticalNavGroup | VerticalNavLink, see
// @core/layouts/components/vertical/navigation/) already supports a NavGroup
// nested inside another NavGroup -- this is exactly the "Apps & Pages" style
// nesting the vendor template ships with, just unused in ConfigFoundry until
// now. Nothing about the rendering engine needed to change; only this data.
//
// Four visually separated blocks (matching four VerticalNavSectionTitle
// entries), top to bottom:
//
//   Operations             Dashboard, Infrastructure (-> Network today;
//                           Compute / Cloud / Storage / Applications
//                           reserved for the roadmap), Validation,
//                           Configuration, Automation, Reports. Everything a
//                           Network Engineer/NOC operator touches day to
//                           day. Always first, never interrupted by
//                           admin/settings noise.
//   (Organization)          A single flat link, "Organization Settings",
//                           not a group -- this is the deliberate result of
//                           a nav-scoped redesign that collapsed what used
//                           to be three expandable groups here (Identity &
//                           Access, Platform, Audit -- 20+ individual leaf
//                           pages: Users, Roles, API Keys, Global Settings,
//                           Authentication, Database, SMTP, Storage,
//                           Integrations, Licensing, Backup & Restore,
//                           Security Policies, Audit Logs) down to one
//                           entry point. None of those pages were touched,
//                           moved, or had functionality removed -- they're
//                           still real routes with their own permissions,
//                           still fully working, just no longer listed
//                           individually in the *global* sidebar. The single
//                           link lands on app/(app)/administration/page.tsx,
//                           a placeholder workspace-landing page that
//                           organizes and links out to all of them (see
//                           that file's header for why it's explicitly a
//                           placeholder and not the real workspace shell).
//   (Personal)              Same idea, one flat link, "Personal Settings" --
//                           collapses what used to be 6 individual leaf
//                           pages (My Profile, Preferences, Sessions,
//                           Theme, Notifications, Personal API Tokens) into
//                           one entry landing on
//                           app/(app)/account/page.tsx.
//   Resources               Documentation. Its own block so it's never
//                           confused for an admin or operational page. (Not
//                           labelled "Documentation" -- that section title
//                           would sit directly above a "Documentation"
//                           link, the same redundant-label pattern fixed
//                           elsewhere in this file.)
//
// This collapse is deliberately nav-only: Organization Settings and
// Personal Settings are entry points into workspaces that don't have their
// own internal navigation yet (their landing pages are plain link lists,
// not a real workspace shell with tabs/secondary-nav) -- building that
// shell is separate, future work. One consequence worth knowing: since
// getPermittedQuickLinks (below) walks this same RAW_SECTIONS data, pages
// like Users/Roles/Global Settings/etc no longer show up as command-palette
// quick-link results either, not just in the sidebar -- consistent with
// the goal of not exposing them globally, but worth knowing if a user goes
// looking for "Users" in Ctrl+/ search and doesn't find it there anymore
// (it's still one click away via Organization Settings).
//
// Roadmap placeholders still in the Operations tree (Compute, Cloud,
// Storage, Applications, Automation, Reports, Rules, Deploy, Change
// History) are real, visible, *disabled* nav entries with a "Soon" badge --
// not hidden. A RawNavLink with no `href` renders disabled (see buildItems
// below): the vendor VerticalNavLink already treats `item.path === undefined`
// as "don't navigate" and `disabled: true` as "grey out, no pointer events,
// no tab focus" (both pre-existing vendor behaviors, not new code).
//
// Every leaf with a real `href` corresponds to a real route under
// app/(app)/. Where a route's backing feature has no server-side data yet
// (see per-route comments in its page.tsx), the page itself says so plainly
// -- the nav entry is never hidden or faked to look "done" when it isn't.
//
// File location mirrors the actual Vuexy bundle's src/navigation/vertical/index.ts.
// ---------------------------------------------------------------------------
import type { VerticalNavItemsType, NavLink, NavGroup, NavSectionTitle } from '@/@core/layouts/types'
import type { Meta } from '@/lib/types'

interface RawNavLink {
  /** Omit entirely (leave undefined) for a roadmap placeholder -- renders
   * disabled, navigates nowhere. */
  href?: string
  label: string
  icon: string
  countKey: 'deviceCount' | 'bandwidthCount' | 'subnetCount' | null
  permission: string | null
  /** Small chip shown after the label, e.g. "Soon". Only set this on the
   * outermost visible placeholder boundary -- a leaf nested inside an
   * already-badged placeholder group doesn't need its own repeated badge. */
  badge?: string
}

interface RawNavGroup {
  label: string
  icon: string
  permission: string | null
  badge?: string
  items: RawNavItem[]
}

type RawNavItem = RawNavLink | RawNavGroup

interface RawSection {
  sectionTitle: string
  items: RawNavItem[]
}

function isRawGroup(item: RawNavItem): item is RawNavGroup {
  return 'items' in item
}

// ---------------------------------------------------------------------------
const RAW_SECTIONS: RawSection[] = [
  {
    sectionTitle: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'tabler:smart-home', countKey: null, permission: null },
      {
        label: 'Infrastructure',
        icon: 'tabler:server-cog',
        permission: 'inventory:read',
        items: [
          {
            label: 'Network',
            icon: 'tabler:topology-star-3',
            permission: 'inventory:read',
            items: [
              { href: '/infrastructure/devices', label: 'Devices', icon: 'tabler:server-2', countKey: 'deviceCount', permission: 'inventory:read' },
              { href: '/infrastructure/bandwidth-profiles', label: 'Bandwidth Profiles', icon: 'tabler:gauge', countKey: 'bandwidthCount', permission: 'inventory:read' },
              { href: '/infrastructure/subnets', label: 'Subnets', icon: 'tabler:topology-star-3', countKey: 'subnetCount', permission: 'inventory:read' },
              { href: '/infrastructure/templates', label: 'Templates', icon: 'tabler:template', countKey: null, permission: 'inventory:read' },
            ],
          },
          {
            label: 'Compute',
            icon: 'tabler:cpu',
            permission: 'inventory:read',
            badge: 'Soon',
            items: [
              { label: 'Physical Hosts', icon: 'tabler:server', countKey: null, permission: null },
              { label: 'Virtual Machines', icon: 'tabler:brand-docker', countKey: null, permission: null },
              { label: 'Kubernetes', icon: 'tabler:brand-kubernetes', countKey: null, permission: null },
              { label: 'Containers', icon: 'tabler:box-seam', countKey: null, permission: null },
              { label: 'Hypervisors', icon: 'tabler:stack-2', countKey: null, permission: null },
            ],
          },
          {
            label: 'Cloud',
            icon: 'tabler:cloud',
            permission: 'inventory:read',
            badge: 'Soon',
            items: [
              { label: 'AWS', icon: 'tabler:brand-aws', countKey: null, permission: null },
              { label: 'Azure', icon: 'tabler:brand-azure', countKey: null, permission: null },
              { label: 'GCP', icon: 'tabler:brand-google', countKey: null, permission: null },
              { label: 'OCI', icon: 'tabler:brand-oracle', countKey: null, permission: null },
            ],
          },
          { label: 'Storage', icon: 'tabler:cloud-upload', countKey: null, permission: null, badge: 'Soon' },
          { label: 'Applications', icon: 'tabler:apps', countKey: null, permission: null, badge: 'Soon' },
        ],
      },
      {
        label: 'Validation',
        icon: 'tabler:checklist',
        permission: 'inventory:read',
        items: [
          { href: '/validation/run', label: 'Run Validation', icon: 'tabler:player-play', countKey: null, permission: 'inventory:read' },
          { href: '/validation/findings', label: 'Findings', icon: 'tabler:alert-triangle', countKey: null, permission: 'inventory:read' },
          { href: '/validation/history', label: 'History', icon: 'tabler:history', countKey: null, permission: 'inventory:read' },
          { label: 'Rules', icon: 'tabler:rule', countKey: null, permission: null, badge: 'Soon' },
        ],
      },
      {
        label: 'Configuration',
        icon: 'tabler:file-code',
        permission: 'deployment:execute',
        items: [
          { href: '/configuration/generate', label: 'Generate Configuration', icon: 'tabler:wand', countKey: null, permission: 'deployment:execute' },
          { href: '/configuration/generated', label: 'Generated Files', icon: 'tabler:files', countKey: null, permission: 'deployment:execute' },
          { href: '/configuration/deployment-history', label: 'Export History', icon: 'tabler:clock-play', countKey: null, permission: 'deployment:execute' },
          { label: 'Deploy', icon: 'tabler:rocket', countKey: null, permission: null, badge: 'Soon' },
          { label: 'Change History', icon: 'tabler:git-commit', countKey: null, permission: null, badge: 'Soon' },
        ],
      },
      { label: 'Automation', icon: 'tabler:robot', countKey: null, permission: null, badge: 'Soon' },
      { label: 'Reports', icon: 'tabler:report', countKey: null, permission: null, badge: 'Soon' },
    ],
  },
  {
    // Single flat link, deliberately not wrapped in its own group -- see
    // the file header for why (a nav-scoped redesign collapsed Identity &
    // Access / Platform / Audit's 20+ leaf pages behind this one entry
    // point). Section title "Organization" rather than "Organization
    // Settings" so it doesn't repeat the link label directly below it.
    sectionTitle: 'Organization',
    items: [
      { href: '/administration', label: 'Organization Settings', icon: 'tabler:building', countKey: null, permission: null },
    ],
  },
  {
    // Same idea for Personal Settings -- see file header. Section title
    // "Personal" rather than "Personal Settings" for the same
    // no-repeated-label reason as Organization above.
    sectionTitle: 'Personal',
    items: [
      { href: '/account', label: 'Personal Settings', icon: 'tabler:user-circle', countKey: null, permission: null },
    ],
  },
  {
    sectionTitle: 'Resources',
    items: [
      { href: '/documentation/', label: 'Documentation', icon: 'tabler:book-2', countKey: null, permission: null },
    ],
  },
]

/** PAGE_TITLES map the (kept, re-skinned) Breadcrumbs component reads from.
 * Entries for pages no longer listed in the sidebar (Users, Roles, Global
 * Settings, Profile, etc.) are deliberately kept here, not removed -- those
 * routes are still real and still reachable from the Organization
 * Settings / Personal Settings landing pages, and still need a correct
 * breadcrumb label when visited. */
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/administration': 'Organization Settings',
  '/account': 'Personal Settings',
  '/infrastructure/devices': 'Devices',
  '/infrastructure/bandwidth-profiles': 'Bandwidth Profiles',
  '/infrastructure/subnets': 'Subnets',
  '/infrastructure/templates': 'Templates',
  '/validation/run': 'Run Validation',
  '/validation/findings': 'Findings',
  '/validation/history': 'History',
  '/configuration/generate': 'Generate Configuration',
  '/configuration/generated': 'Generated Files',
  '/configuration/deployment-history': 'Export History',
  '/administration/users': 'Users',
  '/administration/roles': 'Roles',
  '/administration/api-keys': 'API Keys',
  '/administration/audit-logs': 'Audit Logs',
  '/system/global-settings': 'Global Settings',
  '/system/database': 'Database',
  '/system/storage': 'Storage',
  '/system/smtp': 'SMTP',
  '/system/authentication': 'Authentication',
  '/system/integrations': 'Integrations',
  '/system/licensing': 'Licensing',
  '/system/backup': 'Backup & Restore',
  '/system/security-policies': 'Security Policies',
  '/account/profile': 'My Profile',
  '/account/preferences': 'Preferences',
  '/account/theme': 'Theme',
  '/account/notifications': 'Notifications',
  '/account/sessions': 'Sessions',
  '/account/mfa': 'Multi-Factor Authentication',
  '/account/api-tokens': 'Personal API Tokens',
}

/** A single real, permission-filtered nav destination -- shape shared by the
 * navbar's ShortcutsDropdown ("quick links" grid) and the search dialog's
 * default-suggestions/quick-link results. Both reuse this instead of a
 * separate hardcoded list, so neither can drift from the sidebar or leak a
 * link to a page the current user isn't permitted to open. Roadmap
 * placeholders (no `href`) are never included -- there's nowhere for a
 * quick link or search result to send you. */
export interface QuickLink {
  title: string
  subtitle: string
  icon: string
  url: string
}

function collectQuickLinks(items: RawNavItem[], parentLabel: string, hasPermission: (code: string) => boolean, out: QuickLink[]) {
  for (const item of items) {
    if (item.permission && !hasPermission(item.permission)) continue
    if (isRawGroup(item)) {
      collectQuickLinks(item.items, item.label, hasPermission, out)
    } else if (item.href) {
      out.push({ title: item.label, subtitle: parentLabel, icon: item.icon, url: item.href })
    }
  }
}

export function getPermittedQuickLinks(hasPermission: (code: string) => boolean): QuickLink[] {
  const links: QuickLink[] = []
  for (const section of RAW_SECTIONS) {
    collectQuickLinks(section.items, section.sectionTitle, hasPermission, links)
  }
  return links
}

/**
 * Recursively turns RawNavItem[] into Vuexy's (NavGroup | NavLink)[]. A
 * group whose original `items` array had exactly one entry AND that entry
 * is a leaf link (not a named sub-group) collapses to a flat link, same
 * rule as before -- this is what keeps "Administration" from reading as
 * "Administration > Administration" and so on for every other section.
 * Gating on the *original* item count (not the post-permission-filter
 * count) keeps a given section's shape identical for every user regardless
 * of which leaves their permissions hide.
 */
function buildItems(rawItems: RawNavItem[], hasPermission: (code: string) => boolean, meta: Meta | undefined): (NavGroup | NavLink)[] {
  const result: (NavGroup | NavLink)[] = []

  for (const raw of rawItems) {
    if (raw.permission && !hasPermission(raw.permission)) continue

    if (isRawGroup(raw)) {
      const children = buildItems(raw.items, hasPermission, meta)
      if (children.length === 0) continue

      if (raw.items.length === 1 && !isRawGroup(raw.items[0])) {
        result.push(children[0])
        continue
      }

      result.push({
        title: raw.label,
        icon: raw.icon,
        children,
        ...(raw.badge ? { badgeContent: raw.badge, badgeColor: 'default' as const } : {}),
      })
    } else {
      const isPlaceholder = raw.href === undefined
      result.push({
        title: raw.label,
        icon: raw.icon,
        ...(raw.href ? { path: raw.href } : {}),
        ...(isPlaceholder ? { disabled: true } : {}),
        ...(raw.badge
          ? { badgeContent: raw.badge, badgeColor: 'default' as const }
          : raw.countKey && meta
            ? { badgeContent: String(meta[raw.countKey]), badgeColor: 'primary' as const }
            : {}),
      })
    }
  }

  return result
}

/**
 * Builds Vuexy's VerticalNavItemsType from ConfigFoundry's real permissions
 * and live /meta counts. A leaf link is dropped entirely (not just visually
 * disabled) if the user lacks its permission; a group is dropped if every
 * child under it got filtered out; a section title is dropped too if every
 * item under it disappeared. Roadmap placeholders always pass permission
 * checks (permission: null) -- they're visible to everyone, just inert.
 */
export function buildNavigation(hasPermission: (code: string) => boolean, meta: Meta | undefined): VerticalNavItemsType {
  const items: VerticalNavItemsType = []

  for (const section of RAW_SECTIONS) {
    const visibleItems = buildItems(section.items, hasPermission, meta)
    if (visibleItems.length === 0) continue

    const sectionTitle: NavSectionTitle = { sectionTitle: section.sectionTitle }
    items.push(sectionTitle, ...visibleItems)
  }

  return items
}
