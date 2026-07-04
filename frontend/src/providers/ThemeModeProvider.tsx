'use client'

/**
 * Theme provider -- now Vuexy's ACTUAL settings/theme system, not a from-scratch
 * rebuild.
 *
 * This wraps children in Vuexy's real SettingsProvider (@core/context/settingsContext,
 * a straight vendor port) and builds the MUI theme from Vuexy's real themeOptions()
 * (@core/theme/ThemeOptions.ts -- palette/typography/shadows/overrides, all vendor
 * files). This replaces the hand-built theme/index.ts + theme/palette.ts from the
 * earlier (visual-recreation) pass.
 *
 * Simplifications made vs. the vendor's own ThemeComponent.tsx wrapper:
 *  - No RTL/Direction wrapper -- ConfigFoundry has no RTL requirement, so the
 *    Settings.direction field stays 'ltr' and Vuexy's <Direction> component
 *    was not ported (it exists purely to toggle document dir + a11y attrs).
 *  - CssBaseline/GlobalStyles/ThemeProvider are folded into ONE provider here
 *    (this file) instead of a separate ThemeComponent.tsx, since ConfigFoundry
 *    already had exactly one theme-provider file and duplicating it would
 *    violate the "no duplicate providers" rule.
 *
 * Legacy bridge: Settings.mode is Vuexy's own field (light | dark | semi-dark),
 * persisted by SettingsProvider to its own `settings` localStorage key. The
 * pre-existing `cf-theme` key + `data-theme` attribute are what unmigrated
 * pages (History/Settings/Documentation, still on plain CSS) key their dark
 * mode off of. A small effect below mirrors settings.mode into both so
 * dark-mode toggling stays in sync across migrated and unmigrated pages,
 * same guarantee the old provider made.
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { createTheme, responsiveFontSizes, ThemeProvider as MuiThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { SettingsProvider } from '@/@core/context/settingsContext'
import { useSettings } from '@/@core/hooks/useSettings'
import themeOptions from '@/@core/theme/ThemeOptions'
import globalStyling from '@/@core/theme/globalStyles'
import themeConfig from '@/configs/themeConfig'

const LEGACY_STORAGE_KEY = 'cf-theme'

function ThemeBuilder({ children }: { children: ReactNode }) {
  const { settings } = useSettings()

  const theme = useMemo(() => {
    let t = createTheme(themeOptions(settings, 'light'))
    if (themeConfig.responsiveFontSizes) t = responsiveFontSizes(t)
    return t
  }, [settings])

  // Legacy bridge for pages not yet migrated off plain CSS.
  useEffect(() => {
    const legacyMode = settings.mode === 'light' ? 'light' : 'dark' // semi-dark has no legacy CSS equivalent -> treat as dark
    document.documentElement.setAttribute('data-theme', legacyMode)
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, legacyMode)
    } catch {
      /* ignore -- private browsing etc. */
    }
  }, [settings.mode])

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={() => globalStyling(theme) as never} />
      {children}
    </MuiThemeProvider>
  )
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <SettingsProvider>
        <ThemeBuilder>{children}</ThemeBuilder>
      </SettingsProvider>
    </AppRouterCacheProvider>
  )
}
