// ---------------------------------------------------------------------------
// Sidebar navigation data, shaped for Vuexy's VerticalNavItemsType.
//
// Restructured from the earlier flat 5-group nav into the full nested
// enterprise IA: Inventory / Validation / Configuration / Administration /
// System / Account each expand into real Vuexy NavGroups with NavLink
// children, matching how Vuexy's own reference nav (Apps & Pages) nests
// multi-page modules under one collapsible parent.
//
// Every leaf path below corresponds to a real route under app/(app)/. Where
// a route's backing feature has no server-side data yet (see per-route
// comments in its page.tsx), the page itself says so plainly -- the nav
// entry is never hidden or faked to look "done" when it isn't.
//
// File location mirrors the actual Vuexy bundle's src/navigation/vertical/index.ts.
// ---------------------------------------------------------------------------
import type { VerticalNavItemsType, NavLink, NavGroup, NavSectionTitle } from '@/@core/layouts/types'
import type { Meta } from '@/lib/types'

interface RawNavLink {
  href: string
  label: string
  icon: string
  countKey: 'deviceCount' | 'bandwidthCount' | 'subnetCount' | null
  permission: string | null
}

interface RawNavGroup {
  label: string
  icon: string
  permission: string | null
  items: RawNavLink[]
}

interface RawSection {
  sectionTitle: string
  groups: RawNavGroup[]
}

// Same permission codes / countKey bindings the flat nav used -- only the
// shape changed (single links -> grouped links) to match the requested IA.
const RAW_SECTIONS: RawSection[] = [
  {
    sectionTitle: 'Overview',
    groups: [
      {
        label: 'Dashboard',
        icon: 'tabler:smart-home',
        permission: null,
        items: [{ href: '/dashboard', label: 'Dashboard', icon: 'tabler:smart-home', countKey: null, permission: null }],
      },
    ],
  },
  {
    sectionTitle: 'Inventory',
    groups: [
      {
        label: 'Inventory',
        icon: 'tabler:box',
        permission: 'inventory:read',
        items: [
          { href: '/inventory/devices', label: 'Devices', icon: 'tabler:server-2', countKey: 'deviceCount', permission: 'inventory:read' },
          { href: '/inventory/bandwidth-profiles', label: 'Bandwidth Profiles', icon: 'tabler:gauge', countKey: 'bandwidthCount', permission: 'inventory:read' },
          { href: '/inventory/subnets', label: 'Subnets', icon: 'tabler:topology-star-3', countKey: 'subnetCount', permission: 'inventory:read' },
          { href: '/inventory/templates', label: 'Templates', icon: 'tabler:template', countKey: null, permission: 'inventory:read' },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Validation',
    groups: [
      {
        label: 'Validation',
        icon: 'tabler:checklist',
        permission: 'inventory:read',
        items: [
          { href: '/validation/run', label: 'Run Validation', icon: 'tabler:player-play', countKey: null, permission: 'inventory:read' },
          { href: '/validation/findings', label: 'Findings', icon: 'tabler:alert-triangle', countKey: null, permission: 'inventory:read' },
          { href: '/validation/history', label: 'Validation History', icon: 'tabler:history', countKey: null, permission: 'inventory:read' },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Configuration',
    groups: [
      {
        label: 'Configuration',
        icon: 'tabler:file-code',
        permission: 'deployment:execute',
        items: [
          { href: '/configuration/generate', label: 'Generate Configuration', icon: 'tabler:wand', countKey: null, permission: 'deployment:execute' },
          { href: '/configuration/generated', label: 'Generated Configurations', icon: 'tabler:files', countKey: null, permission: 'deployment:execute' },
          { href: '/configuration/deployment-history', label: 'Deployment History', icon: 'tabler:clock-play', countKey: null, permission: 'deployment:execute' },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Administration',
    groups: [
      {
        label: 'Administration',
        icon: 'tabler:shield-cog',
        permission: null,
        items: [
          { href: '/administration/users', label: 'Users', icon: 'tabler:users', countKey: null, permission: 'user:read' },
          { href: '/administration/roles', label: 'Roles', icon: 'tabler:shield-lock', countKey: null, permission: 'role:read' },
          { href: '/administration/api-keys', label: 'API Keys', icon: 'tabler:key', countKey: null, permission: 'api:manage' },
          { href: '/administration/audit-logs', label: 'Audit Logs', icon: 'tabler:receipt-2', countKey: null, permission: 'audit:read' },
        ],
      },
    ],
  },
  {
    sectionTitle: 'System',
    groups: [
      {
        label: 'System',
        icon: 'tabler:settings-2',
        permission: null,
        items: [
          { href: '/system/global-settings', label: 'Global Settings', icon: 'tabler:adjustments', countKey: null, permission: null },
          { href: '/system/database', label: 'Database', icon: 'tabler:database', countKey: null, permission: null },
          { href: '/system/storage', label: 'Storage', icon: 'tabler:cloud-upload', countKey: null, permission: null },
          { href: '/system/smtp', label: 'SMTP', icon: 'tabler:mail', countKey: null, permission: null },
          { href: '/system/authentication', label: 'Authentication', icon: 'tabler:lock-access', countKey: null, permission: null },
          { href: '/system/integrations', label: 'Integrations', icon: 'tabler:plug', countKey: null, permission: null },
          { href: '/system/licensing', label: 'Licensing', icon: 'tabler:license', countKey: null, permission: null },
          { href: '/system/backup', label: 'Backup & Restore', icon: 'tabler:database-export', countKey: null, permission: null },
          { href: '/system/security-policies', label: 'Security Policies', icon: 'tabler:shield-lock', countKey: null, permission: 'policy:manage' },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Account',
    groups: [
      {
        label: 'Account',
        icon: 'tabler:user-circle',
        permission: null,
        items: [
          { href: '/account/profile', label: 'Profile', icon: 'tabler:user', countKey: null, permission: null },
          { href: '/account/preferences', label: 'Preferences', icon: 'tabler:adjustments-horizontal', countKey: null, permission: null },
          { href: '/account/theme', label: 'Theme', icon: 'tabler:palette', countKey: null, permission: null },
          { href: '/account/notifications', label: 'Notifications', icon: 'tabler:bell', countKey: null, permission: null },
          { href: '/account/sessions', label: 'Sessions', icon: 'tabler:devices', countKey: null, permission: null },
          { href: '/account/mfa', label: 'Multi-Factor Authentication', icon: 'tabler:shield-check', countKey: null, permission: null },
          { href: '/account/api-tokens', label: 'API Tokens', icon: 'tabler:key', countKey: null, permission: null },
        ],
      },
    ],
  },
  {
    sectionTitle: 'Resources',
    groups: [
      {
        label: 'Documentation',
        icon: 'tabler:book-2',
        permission: null,
        items: [{ href: '/documentation/', label: 'Documentation', icon: 'tabler:book-2', countKey: null, permission: null }],
      },
    ],
  },
]

/** PAGE_TITLES map the (kept, re-skinned) Breadcrumbs component reads from. */
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory/devices': 'Devices',
  '/inventory/bandwidth-profiles': 'Bandwidth Profiles',
  '/inventory/subnets': 'Subnets',
  '/inventory/templates': 'Templates',
  '/validation/run': 'Run Validation',
  '/validation/findings': 'Findings',
  '/validation/history': 'Validation History',
  '/configuration/generate': 'Generate Configuration',
  '/configuration/generated': 'Generated Configurations',
  '/configuration/deployment-history': 'Deployment History',
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
  '/account/profile': 'Profile',
  '/account/preferences': 'Preferences',
  '/account/theme': 'Theme',
  '/account/notifications': 'Notifications',
  '/account/sessions': 'Sessions',
  '/account/mfa': 'Multi-Factor Authentication',
  '/account/api-tokens': 'API Tokens',
}

/** A single real, permission-filtered nav destination -- shape shared by the
 * navbar's ShortcutsDropdown ("quick links" grid) and the search dialog's
 * default-suggestions/quick-link results. Both reuse this instead of a
 * separate hardcoded list, so neither can drift from the sidebar or leak a
 * link to a page the current user isn't permitted to open. */
export interface QuickLink {
  title: string
  subtitle: string
  icon: string
  url: string
}

/** Flattens RAW_SECTIONS into real, permission-filtered quick links -- same
 * filter rule as buildNavigation below, just without the group/section
 * markers a flat list has no use for. `subtitle` is the parent group label
 * ("Inventory", "Administration", ...), mirroring Vuexy's ShortcutsType.subtitle. */
export function getPermittedQuickLinks(hasPermission: (code: string) => boolean): QuickLink[] {
  const links: QuickLink[] = []

  for (const section of RAW_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.permission === null || hasPermission(item.permission)) {
          links.push({ title: item.label, subtitle: group.label, icon: item.icon, url: item.href })
        }
      }
    }
  }

  return links
}

/**
 * Builds Vuexy's VerticalNavItemsType from ConfigFoundry's real permissions
 * and live /meta counts. A leaf link is dropped entirely (not just visually
 * disabled) if the user lacks its permission; a group is dropped if every
 * child under it got filtered out; a section title is dropped too if every
 * group under it disappeared.
 */
export function buildNavigation(hasPermission: (code: string) => boolean, meta: Meta | undefined): VerticalNavItemsType {
  const items: VerticalNavItemsType = []

  for (const section of RAW_SECTIONS) {
    const visibleGroups: (NavGroup | NavLink)[] = []

    for (const group of section.groups) {
      const visibleLinks: NavLink[] = group.items
        .filter(item => item.permission === null || hasPermission(item.permission))
        .map(item => ({
          title: item.label,
          path: item.href,
          icon: item.icon,
          ...(item.countKey && meta ? { badgeContent: String(meta[item.countKey]), badgeColor: 'primary' as const } : {}),
        }))

      if (visibleLinks.length === 0) continue

      // Single-item groups (Dashboard, Documentation) render as a plain
      // link rather than a one-row collapsible group, matching how Vuexy's
      // own reference nav treats standalone pages vs multi-page modules.
      if (visibleLinks.length === 1 && group.items.length === 1) {
        visibleGroups.push(visibleLinks[0])
        continue
      }

      visibleGroups.push({
        title: group.label,
        icon: group.icon,
        children: visibleLinks,
      })
    }

    if (visibleGroups.length === 0) continue

    const sectionTitle: NavSectionTitle = { sectionTitle: section.sectionTitle }
    items.push(sectionTitle, ...visibleGroups)
  }

  return items
}
