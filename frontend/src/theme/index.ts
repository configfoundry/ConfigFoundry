import { createTheme, type Theme } from '@mui/material/styles'
import { vuexyColors, darkPaletteTokens, lightPaletteTokens } from './palette'

export type ColorMode = 'light' | 'dark'

/**
 * Builds the MUI theme for the given mode using Vuexy's default token
 * values (colors, shape, typography). This is the single source of theme
 * truth for every module migrated to the Vuexy design system -- do not
 * create a second theme object elsewhere.
 */
export function getAppTheme(mode: ColorMode): Theme {
  const tokens = mode === 'dark' ? darkPaletteTokens : lightPaletteTokens

  return createTheme({
    palette: {
      mode,
      primary: vuexyColors.primary,
      secondary: vuexyColors.secondary,
      error: vuexyColors.error,
      warning: vuexyColors.warning,
      info: vuexyColors.info,
      success: vuexyColors.success,
      background: tokens.background,
      text: tokens.text,
      divider: tokens.divider,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Inter',
        'Segoe UI',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      button: { textTransform: 'none', fontWeight: 500 },
      h6: { fontWeight: 600 },
    },
    shadows: (Array(25).fill(
      mode === 'dark'
        ? '0 2px 6px 0 rgba(19,17,32,0.45)'
        : '0 2px 6px 0 rgba(76,78,100,0.12)',
    ) as unknown) as Theme['shadows'],
    components: {
      MuiCard: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  })
}
