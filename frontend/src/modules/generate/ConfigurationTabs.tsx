'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

const TABS = [
  { href: '/configuration/generate', label: 'Generate Configuration' },
  { href: '/configuration/generated', label: 'Generated Configurations' },
  { href: '/configuration/deployment-history', label: 'Deployment History' },
]

/** Sub-navigation for the Configuration section -- same pattern as
 * modules/inventory/InventoryTabs.tsx / modules/validation/ValidationTabs.tsx. */
export function ConfigurationTabs() {
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
