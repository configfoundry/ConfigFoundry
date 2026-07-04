// ** MUI Theme Provider
import { deepmerge } from '@mui/utils'
import { PaletteMode, ThemeOptions } from '@mui/material'

// ** User Theme Options
import UserThemeOptions from '@/layouts/UserThemeOptions'

// ** Type Import
import { Settings } from '@/@core/context/settingsContext'
import { ThemeColor } from '@/@core/layouts/types'

// ** Theme Override Imports
import palette from './palette'
import spacing from './spacing'
import shadows from './shadows'
import overrides from './overrides'
import typography from './typography'
import breakpoints from './breakpoints'

// The only keys that are actually { light, main, dark, contrastText } color
// groups on the palette. `settings.themeColor` is read back verbatim from
// localStorage (see settingsContext.tsx's restoreSettings) with no schema
// validation, so a stale/corrupted/hand-edited value here must never be
// trusted as a palette key -- indexing `palette[themeColor]` with anything
// outside this set (e.g. 'customColors') pulls back an unrelated object
// (customColors' raw RGB-channel strings meant only for `rgba(${...})`
// interpolation, never a standalone color) and assigns it onto
// `palette.primary`. Every MUI internal component that then calls
// `alpha(theme.palette.primary.main, ...)` -- Button, Chip, Switch,
// TimelineDot, DataGrid row selection, etc. -- crashes with
// "MUI: Unsupported `47, 43, 61` color" (MUI error #9).
const VALID_THEME_COLORS: ThemeColor[] = ['primary', 'secondary', 'success', 'error', 'warning', 'info']

const themeOptions = (settings: Settings, overrideMode: PaletteMode): ThemeOptions => {
  // ** Vars
  const { skin, mode, direction, themeColor: rawThemeColor } = settings
  const themeColor: ThemeColor = VALID_THEME_COLORS.includes(rawThemeColor) ? rawThemeColor : 'primary'

  // ** Create New object before removing user component overrides and typography objects from userThemeOptions
  const userThemeConfig: ThemeOptions = Object.assign({}, UserThemeOptions())

  const mergedThemeConfig: ThemeOptions = deepmerge(
    {
      breakpoints: breakpoints(),
      direction,
      components: overrides(settings),
      palette: palette(mode === 'semi-dark' ? overrideMode : mode, skin),
      ...spacing,
      shape: {
        borderRadius: 6
      },
      mixins: {
        toolbar: {
          minHeight: 64
        }
      },
      shadows: shadows(mode === 'semi-dark' ? overrideMode : mode),
      typography
    },
    userThemeConfig
  )

  return deepmerge(mergedThemeConfig, {
    palette: {
      primary: {
        ...(mergedThemeConfig.palette
          ? mergedThemeConfig.palette[themeColor]
          : palette(mode === 'semi-dark' ? overrideMode : mode, skin).primary)
      }
    }
  })
}

export default themeOptions
