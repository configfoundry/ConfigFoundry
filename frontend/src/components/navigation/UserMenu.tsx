'use client'

import { useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '@/providers/AuthProvider'

/** Account dropdown. Wraps the existing useAuth().logout() -- no auth logic changed. */
export function UserMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  if (!user) return null

  const label = user.email ?? user.name ?? 'Account'
  const initial = label.slice(0, 1).toUpperCase()
  const roleNames = user.roles?.map((r) => r.name).join(', ') || 'No roles assigned'

  async function handleLogout() {
    setAnchorEl(null)
    await logout()
    router.push('/login')
  }

  return (
    <>
      <IconButton
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        size="small"
        sx={{ ml: 0.5 }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
          {initial}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { minWidth: 220, mt: 1 } }}>
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {roleNames}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={Link} href="/settings?tab=security" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <LockOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Security settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  )
}
