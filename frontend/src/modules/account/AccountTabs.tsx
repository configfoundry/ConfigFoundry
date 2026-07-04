'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

const TABS = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/preferences', label: 'Preferences' },
  { href: '/account/theme', label: 'Theme' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/account/sessions', label: 'Sessions' },
  { href: '/account/mfa', label: 'MFA' },
  { href: '/account/api-tokens', label: 'API Tokens' },
]

/** Sub-navigation for the Account section -- same pattern as the other
 * *Tabs.tsx components. */
export function AccountTabs() {
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
