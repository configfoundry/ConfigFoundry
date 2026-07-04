'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { useAuth } from '@/providers/AuthProvider'

const TABS = [
  { href: '/admin/users', label: 'Users', permission: 'user:read' },
  { href: '/admin/roles', label: 'Roles', permission: 'role:read' },
  { href: '/admin/policies', label: 'IP Policies', permission: 'policy:manage' },
  { href: '/admin/api-keys', label: 'API Keys', permission: 'api:manage' },
  { href: '/admin/audit-logs', label: 'Audit Logs', permission: 'audit:read' },
]

/**
 * Sub-navigation for the Administration section. Each tab is a real
 * <Link> to its own existing route (routes are unchanged) -- this is a
 * visual grouping only, not a single page that swaps content in place,
 * so deep links / back-forward / bookmarks to /admin/users etc. keep
 * working exactly as before. Tabs are filtered by the same permission
 * codes the sidebar already uses (navConfig.tsx), so a user never sees a
 * tab for a page they can't open.
 */
export function AdminTabs() {
  const pathname = usePathname()
  const { hasPermission } = useAuth()
  const visible = TABS.filter((t) => hasPermission(t.permission))
  const current = visible.find((t) => pathname.startsWith(t.href))?.href ?? false

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
      <Tabs value={current} variant="scrollable" scrollButtons="auto">
        {visible.map((t) => (
          <Tab key={t.href} value={t.href} label={t.label} component={Link} href={t.href} />
        ))}
      </Tabs>
    </Box>
  )
}
