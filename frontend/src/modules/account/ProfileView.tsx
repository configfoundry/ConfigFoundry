'use client'

import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import { useAuth } from '@/providers/AuthProvider'
import { getInitials } from '@/@core/utils/get-initials'
import { ChangePasswordCard } from './ChangePasswordCard'

export function ProfileView() {
  const { user } = useAuth()
  const displayName = user?.full_name || user?.name || user?.email || 'User'

  return (
    <Stack spacing={4}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'center' }}>
            <Avatar sx={{ width: 84, height: 84, fontSize: '2rem' }}>{getInitials(displayName)}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{displayName}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                {(user?.roles ?? []).map(r => (
                  <Chip key={r.id} label={r.name} size="small" variant="outlined" />
                ))}
                {user?.mfa_enabled && <Chip label="MFA Enabled" size="small" color="success" />}
              </Stack>
            </Box>
          </Stack>
          <Divider sx={{ my: 4 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="text.secondary">User ID</Typography>
              <Typography variant="body2" fontFamily="monospace">{user?.id}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="text.secondary">Password Status</Typography>
              <Box>
                <Chip
                  size="small"
                  label={user?.must_change_password ? 'Change required' : 'Up to date'}
                  color={user?.must_change_password ? 'warning' : 'success'}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </Stack>
  )
}
