'use client'

/**
 * Standard page-content header: Title -> Description (optional) -> Primary
 * Action, used at the top of every page's content area. The breadcrumb
 * itself lives once, in the AppBar (see components/navigation/Breadcrumbs.tsx)
 * -- it is NOT repeated here, and pages should not render their own
 * in-page tab-strip sub-navigation either (the sidebar's nested groups
 * already provide that). This component is the single "what page am I on
 * and what's the one thing I'd do here" signal for page content, replacing
 * the ad hoc per-page Typography headers and duplicate tab bars from the
 * first migration pass.
 */
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  dense?: boolean
}

export function PageHeader({ title, description, action, dense = false }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{ mb: dense ? 3 : 4 }}
    >
      <Box>
        <Typography variant="h5" fontWeight={600}>{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  )
}
