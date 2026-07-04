'use client'

// ** React Import
import { useEffect, useRef } from 'react'

// ** Type Import
import { LayoutProps } from '@/@core/layouts/types'

// ** Layout Components
// NOTE: HorizontalLayout intentionally not ported -- ConfigFoundry only ships
// a vertical sidebar nav, so settings.layout is always 'vertical' (see
// configs/themeConfig.ts). Keeping this out avoids pulling in a whole second
// nav-rendering system with nothing to exercise it.
import VerticalLayout from './VerticalLayout'

const Layout = (props: LayoutProps) => {
  // ** Props
  const { hidden, children, settings, saveSettings } = props

  // ** Ref
  const isCollapsed = useRef(settings.navCollapsed)

  useEffect(() => {
    if (hidden) {
      if (settings.navCollapsed) {
        saveSettings({ ...settings, navCollapsed: false, layout: 'vertical' })
        isCollapsed.current = true
      }
    } else {
      if (isCollapsed.current) {
        saveSettings({ ...settings, navCollapsed: true, layout: settings.lastLayout })
        isCollapsed.current = false
      } else {
        if (settings.lastLayout !== settings.layout) {
          saveSettings({ ...settings, layout: settings.lastLayout })
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden])

  return <VerticalLayout {...props}>{children}</VerticalLayout>
}

export default Layout
