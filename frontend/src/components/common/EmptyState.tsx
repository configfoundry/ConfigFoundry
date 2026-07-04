import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'

interface EmptyStateProps {
  title: string
  sub?: ReactNode
  action?: ReactNode
}

/** MUI empty-state placeholder, used inside migrated modules' tables/cards. */
export function EmptyState({ title, sub, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <InboxOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      {sub && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {sub}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}
