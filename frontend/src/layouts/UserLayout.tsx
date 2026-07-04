'use client'

// ** React Imports
import { ReactNode } from 'react'

// ** MUI Imports
import { Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

// ** React Query Import
import { useQuery } from '@tanstack/react-query'

// ** Layout Import
// !Do not remove this Layout import
import Layout from '@/@core/layouts/Layout'

// ** Navigation Import
import { buildNavigation } from '@/navigation/vertical'

// ** Component Import
import VerticalAppBarContent from './components/vertical/AppBarContent'

// ** Hook Imports
import { useSettings } from '@/@core/hooks/useSettings'
import { useAuth } from '@/providers/AuthProvider'
import { api } from '@/lib/api'

/**
 * This is ConfigFoundry's version of Vuexy's src/layouts/UserLayout.tsx -- the
 * wiring point that assembles the vendor's <Layout> with real nav items and a
 * real AppBar. Differences from the vendor file:
 *  - No horizontal-layout branch (not ported, see @core/layouts/Layout.tsx).
 *  - navItems come from buildNavigation(hasPermission, meta) instead of a
 *    static demo array -- same permission codes / countKey bindings the old
 *    hand-built Sidebar used.
 *  - meta is the same ['meta'] react-query call the old AppLayout.tsx and the
 *    Dashboard page both use, so react-query dedupes the request.
 */
interface Props {
  children: ReactNode
  contentHeightFixed?: boolean
}

const UserLayout = ({ children, contentHeightFixed }: Props) => {
  // ** Hooks
  const { settings, saveSettings } = useSettings()
  const { hasPermission } = useAuth()

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
    refetchInterval: 60_000,
  })

  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))

  return (
    <Layout
      hidden={hidden}
      settings={settings}
      saveSettings={saveSettings}
      contentHeightFixed={contentHeightFixed}
      verticalLayoutProps={{
        navMenu: {
          navItems: buildNavigation(hasPermission, meta),
        },
        appBar: {
          content: props => (
            <VerticalAppBarContent
              hidden={hidden}
              settings={settings}
              saveSettings={saveSettings}
              toggleNavVisibility={props.toggleNavVisibility}
            />
          ),
        },
      }}
    >
      {children}
    </Layout>
  )
}

export default UserLayout
