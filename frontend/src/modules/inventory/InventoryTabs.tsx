'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const TABS = [
  { href: '/inventory/devices', label: 'Devices', countKey: 'deviceCount' as const },
  { href: '/inventory/bandwidth-profiles', label: 'Bandwidth Profiles', countKey: 'bandwidthCount' as const },
  { href: '/inventory/subnets', label: 'Subnets', countKey: 'subnetCount' as const },
  { href: '/inventory/templates', label: 'Templates', countKey: null },
]

/**
 * Sub-navigation for the Inventory section -- same pattern as
 * modules/administration/AdminTabs.tsx: each tab is a real <Link> to its
 * own route, not a single page swapping content in place, so deep links,
 * back/forward, and bookmarks all keep working. Replaces the in-page
 * `<Tabs>` that used to live directly in InventoryView.tsx now that each
 * entity is a standalone route under the new nested sidebar group.
 */
export function InventoryTabs() {
  const pathname = usePathname()
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.getMeta() })
  const current = TABS.find(t => pathname.startsWith(t.href))?.href ?? false

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
      <Tabs value={current} variant="scrollable" scrollButtons="auto">
        {TABS.map(t => (
          <Tab
            key={t.href}
            value={t.href}
            label={t.countKey && meta ? `${t.label} (${meta[t.countKey]})` : t.label}
            component={Link}
            href={t.href}
          />
        ))}
      </Tabs>
    </Box>
  )
}
