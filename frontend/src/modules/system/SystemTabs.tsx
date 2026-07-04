'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

const TABS = [
  { href: '/system/global-settings', label: 'Global Settings' },
  { href: '/system/database', label: 'Database' },
  { href: '/system/storage', label: 'Storage' },
  { href: '/system/smtp', label: 'SMTP' },
  { href: '/system/authentication', label: 'Authentication' },
  { href: '/system/integrations', label: 'Integrations' },
  { href: '/system/licensing', label: 'Licensing' },
  { href: '/system/backup', label: 'Backup & Restore' },
  { href: '/system/security-policies', label: 'Security Policies' },
]

/** Sub-navigation for the System section -- same pattern as the other
 * *Tabs.tsx components (InventoryTabs, ValidationTabs, ConfigurationTabs,
 * AdminTabs). */
export function SystemTabs() {
  const pathname = usePathname()
  const current = TABS.find(t => pathname.startsWith(t.href))?.href ?? false

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
      <Tabs value={current} variant="scrollable" scrollButtons="auto">
        {TABS.map(t => (
          <Tab key={t.href} value={t.href} label={t.label} component={Link} href={t.href} />
        ))}
      </Tabs>
    </Box>
  )
}
