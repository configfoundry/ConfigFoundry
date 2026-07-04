'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import { useTheme } from '@mui/material/styles'
import type { Meta } from '@/lib/types'
import { NAV_GROUPS, DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from '@/layouts/navConfig'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  meta: Meta | undefined
  hasPermission: (code: string) => boolean
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.5, minHeight: 64 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 1,
          background: (t) => t.palette.primary.main,
          flexShrink: 0,
        }}
      />
      {!collapsed && (
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          Config<Box component="span" sx={{ color: 'primary.main' }}>Foundry</Box>
        </Typography>
      )}
    </Box>
  )
}

function NavList({
  collapsed,
  meta,
  hasPermission,
  onNavigate,
}: {
  collapsed: boolean
  meta: Meta | undefined
  hasPermission: (code: string) => boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0)

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
      {visibleGroups.map((group) => (
        <Box key={group.label} sx={{ mb: 1.5 }}>
          {!collapsed && (
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                color: 'text.disabled',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {group.label}
            </Typography>
          )}
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const count = item.countKey && meta ? meta[item.countKey] : null
              const button = (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={active}
                  onClick={onNavigate}
                  sx={{
                    borderRadius: 2,
                    mb: 0.25,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <>
                      <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 600 : 500 }}>
                        {item.label}
                      </ListItemText>
                      {count != null && (
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 11,
                            bgcolor: active ? 'rgba(255,255,255,0.2)' : 'action.selected',
                          }}
                        />
                      )}
                    </>
                  )}
                </ListItemButton>
              )
              return collapsed ? (
                <Tooltip key={item.href} title={item.label} placement="right">
                  <Box>{button}</Box>
                </Tooltip>
              ) : (
                button
              )
            })}
          </List>
        </Box>
      ))}
    </Box>
  )
}

/** Desktop permanent/mini sidebar + mobile temporary drawer. */
export function Sidebar({ mobileOpen, onMobileClose, collapsed, meta, hasPermission }: SidebarProps) {
  const theme = useTheme()
  const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Brand collapsed={collapsed} />
      <Divider />
      <NavList collapsed={collapsed} meta={meta} hasPermission={hasPermission} />
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.disabled">
            v0.5 · ConfigFoundry
          </Typography>
        </Box>
      )}
    </Box>
  )

  return (
    <>
      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: (t) => t.transitions.create('width'),
          '& .MuiDrawer-paper': {
            width,
            overflowX: 'hidden',
            transition: (t) => t.transitions.create('width'),
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        open
      >
        {content}
      </Drawer>

      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        <Box onClick={onMobileClose} sx={{ height: '100%' }}>
          {content}
        </Box>
      </Drawer>
    </>
  )
}
