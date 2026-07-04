'use client'

/**
 * Vuexy-style application shell.
 *
 * Replaces the old components/AppShell.tsx (removed). Same data sources,
 * same permissions, same routes:
 *  - useAuth() for hasPermission() (nav filtering) -- unchanged.
 *  - useQuery(['meta']) via lib/api.getMeta() -- unchanged, same query key
 *    the Dashboard page also uses, so react-query dedupes the request.
 *
 * Only the presentation layer (plain CSS -> MUI/Vuexy) changed.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Navbar } from '@/components/navigation/Navbar'
import { Footer } from '@/components/common/Footer'

const COLLAPSE_KEY = 'cf-sidebar-collapsed'

export function AppLayout({ children }: { children: ReactNode }) {
  const { hasPermission } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
    refetchInterval: 60_000,
  })

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        meta={meta}
        hasPermission={hasPermission}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          meta={meta}
          onMobileMenuClick={() => setMobileOpen(true)}
          onCollapseClick={toggleCollapsed}
          collapsed={collapsed}
        />
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  )
}
