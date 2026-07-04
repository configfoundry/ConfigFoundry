'use client'

/**
 * MUI theme provider for Vuexy-migrated pages.
 *
 * Shares the existing `cf-theme` localStorage key and `data-theme` attribute
 * with the legacy (pre-Vuexy) CSS in globals.css, so toggling dark mode
 * stays in sync across modules that have and haven't been migrated yet.
 * The pre-paint script in app/layout.tsx already sets `data-theme` before
 * hydration to avoid a flash; this provider just mirrors that value into
 * the MUI theme.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { getAppTheme, type ColorMode } from '@/theme'

const STORAGE_KEY = 'cf-theme'

interface ColorModeContextValue {
  mode: ColorMode
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used within ThemeModeProvider')
  return ctx
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') setMode(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ColorMode = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const theme = useMemo(() => getAppTheme(mode), [mode])
  const ctxValue = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode])

  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ColorModeContext.Provider value={ctxValue}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  )
}
