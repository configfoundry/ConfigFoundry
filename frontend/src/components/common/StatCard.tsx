import type { ReactNode } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import type { SvgIconComponent } from '@mui/icons-material'

export type StatColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: SvgIconComponent
  color?: StatColor
}

/**
 * Vuexy-style "card-statistics" tile: soft-colored icon avatar + big value + label.
 * Generic/reusable across modules -- not dashboard-specific -- hence its home in
 * components/common rather than modules/dashboard.
 */
export function StatCard({ label, value, sub, icon: Icon, color = 'primary' }: StatCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: (t) => `${t.palette[color].main}1f`,
              color: (t) => t.palette[color].main,
              width: 42,
              height: 42,
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}
