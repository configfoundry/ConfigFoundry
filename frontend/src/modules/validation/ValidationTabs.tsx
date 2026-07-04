'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

const TABS = [
  { href: '/validation/run', label: 'Run Validation' },
  { href: '/validation/findings', label: 'Findings' },
  { href: '/validation/history', label: 'Validation History' },
]

/** Sub-navigation for the Validation section -- same pattern as
 * modules/inventory/InventoryTabs.tsx / modules/administration/AdminTabs.tsx. */
export function ValidationTabs() {
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
