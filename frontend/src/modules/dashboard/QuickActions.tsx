'use client'

/**
 * Quick Actions -- ConfigFoundry operational widget, restyled as a Vuexy
 * Card with Action Buttons: same CustomAvatar+Icon row convention already
 * used by every other widget on this dashboard (InventoryOverview,
 * InventorySummary, etc.), each row paired with a real navigation button.
 * Same 4 destinations as the pre-migration version -- only the presentation
 * changed.
 */
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import type { ThemeColor } from '@/@core/layouts/types'

interface Action {
  title: string
  subtitle: string
  href: string
  icon: string
  color: ThemeColor
  cta: string
}

const actions: Action[] = [
  { title: 'Generate Config', subtitle: 'Produce new YAML output', href: '/configuration/generate', icon: 'tabler:wand', color: 'primary', cta: 'Generate' },
  { title: 'Manage Devices', subtitle: 'Review and edit inventory', href: '/inventory/devices', icon: 'tabler:box', color: 'info', cta: 'Manage' },
  { title: 'Run Validation', subtitle: 'Check current inventory health', href: '/validation/run', icon: 'tabler:checklist', color: 'warning', cta: 'Run' },
  { title: 'View History', subtitle: 'Browse past generation runs', href: '/configuration/generated', icon: 'tabler:history', color: 'secondary', cta: 'View' },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader title="Quick Actions" subheader="Jump to a common task" />
      <CardContent>
        <Stack spacing={4}>
          {actions.map((action) => (
            <Box key={action.href} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <CustomAvatar skin="light" variant="rounded" color={action.color} sx={{ mr: 3, width: 34, height: 34, flexShrink: 0 }}>
                  <Icon fontSize="1.25rem" icon={action.icon} />
                </CustomAvatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" noWrap>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ color: 'text.disabled' }}>
                    {action.subtitle}
                  </Typography>
                </Box>
              </Box>
              <Button component={Link} href={action.href} variant="outlined" size="small" sx={{ flexShrink: 0 }}>
                {action.cta}
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
