'use client'

import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Badge from '@mui/material/Badge'
import Menu from '@mui/material/Menu'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import MenuOpenOutlinedIcon from '@mui/icons-material/MenuOpenOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import type { Meta } from '@/lib/types'
import { useColorMode } from '@/providers/ThemeModeProvider'
import { Breadcrumbs } from './Breadcrumbs'
import { UserMenu } from './UserMenu'

interface NavbarProps {
  meta: Meta | undefined
  onMobileMenuClick: () => void
  onCollapseClick: () => void
  collapsed: boolean
}

export function Navbar({ meta, onMobileMenuClick, onCollapseClick, collapsed }: NavbarProps) {
  const { mode, toggleMode } = useColorMode()
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null)

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}`, backdropFilter: 'blur(6px)' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" onClick={onMobileMenuClick} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
          <MenuOutlinedIcon />
        </IconButton>
        <IconButton onClick={onCollapseClick} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          {collapsed ? <MenuOutlinedIcon /> : <MenuOpenOutlinedIcon />}
        </IconButton>

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Breadcrumbs />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {meta && (
          <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', lg: 'flex' }, mr: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>{meta.deviceCount}</strong> devices
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>{meta.bandwidthCount}</strong> bw rows
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>{meta.subnetCount}</strong> subnets
            </Typography>
          </Stack>
        )}

        <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)}>
          <Badge variant="dot" color="primary" invisible>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
        <Menu anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)}>
          <Box sx={{ px: 2, py: 1.5, minWidth: 220 }}>
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        </Menu>

        <IconButton onClick={toggleMode} title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>

        <UserMenu />
      </Toolbar>
    </AppBar>
  )
}
