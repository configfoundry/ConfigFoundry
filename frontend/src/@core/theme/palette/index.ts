// ** Type Imports
import { Palette } from '@mui/material'
import { Skin } from '@/@core/layouts/types'

const DefaultPalette = (mode: Palette['mode'], skin: Skin): Palette => {
  // ** Vars
  const whiteColor = '#FFF'
  // Pixel-matched against the licensed Vuexy Bootstrap5 HTML edition's own
  // light-mode ink base (--bs-card-box-shadow: rgba(75, 70, 92, ...) in
  // assets/vendor/css/rtl/core.css) at the user's explicit request to align
  // this React/MUI port's shadow/text/divider tint with that edition's
  // values. Was '47, 43, 61' (a different, but equally valid, per-edition
  // Vuexy ink tone) -- global change, affects every page via
  // text.primary/secondary/disabled, divider, action.* below, and the
  // matching swap in ../shadows/index.ts.
  const lightColor = '75, 70, 92'
  const darkColor = '208, 212, 241'
  const darkPaperBgColor = '#2F3349'
  const mainColor = mode === 'light' ? lightColor : darkColor

  const defaultBgColor = () => {
    if (skin === 'bordered' && mode === 'light') {
      return whiteColor
    } else if (skin === 'bordered' && mode === 'dark') {
      return darkPaperBgColor
    } else if (mode === 'light') {
      return '#F8F7FA'
    } else return '#25293C'
  }

  return {
    customColors: {
      // NOT named `dark`/`light` on purpose -- MUI's own Switch and Alert
      // components (node_modules/@mui/material/{Switch,Alert}/*.js) generate
      // their style "variants" by doing
      // `Object.entries(theme.palette).filter(([, v]) => v.main && v.light)`
      // (Alert also checks `v.main && v.dark`) to auto-discover every
      // palette group that LOOKS like a real color intent (primary,
      // secondary, etc). `customColors` is not a selectable color intent --
      // it's a private bag of raw RGB-channel strings for `rgba(${...})`
      // interpolation -- but having `main` alongside a sibling `dark`/`light`
      // key made it structurally indistinguishable from one. MUI then
      // generated a real 'customColors' style variant and called
      // `alpha(theme.palette.customColors.main, ...)` on it -- `.main` here
      // is a bare "r, g, b" string, not a valid CSS color, so every Switch
      // and every Alert on every page crashed with
      // "MUI: Unsupported `47, 43, 61` color" (or the dark-mode triplet)
      // the instant either component rendered anywhere in the tree.
      // darkChannel/lightChannel are never read anywhere else in this repo
      // (grepped) -- they only ever existed to mirror mainColor for
      // potential future use -- so renaming them is a no-op for every real
      // usage and permanently de-collides `customColors` from this MUI
      // auto-discovery mechanism.
      darkChannel: darkColor,
      main: mainColor,
      lightChannel: lightColor,
      lightPaperBg: whiteColor,
      darkPaperBg: darkPaperBgColor,
      bodyBg: mode === 'light' ? '#F8F7FA' : '#25293C', // Same as palette.background.default but doesn't consider bordered skin
      trackBg: mode === 'light' ? '#F1F0F2' : '#363B54',
      avatarBg: mode === 'light' ? '#DBDADE' : '#4A5072',
      tableHeaderBg: mode === 'light' ? '#F6F6F7' : '#4A5072'
    },
    mode: mode,
    common: {
      black: '#000',
      white: whiteColor
    },
    primary: {
      light: '#8479F2',
      main: '#7367F0',
      dark: '#655BD3',
      contrastText: whiteColor
    },
    secondary: {
      light: '#B2B4B8',
      main: '#A8AAAE',
      dark: '#949699',
      contrastText: whiteColor
    },
    error: {
      light: '#ED6F70',
      main: '#EA5455',
      dark: '#CE4A4B',
      contrastText: whiteColor
    },
    warning: {
      light: '#FFAB5A',
      main: '#FF9F43',
      dark: '#E08C3B',
      contrastText: whiteColor
    },
    info: {
      light: '#1FD5EB',
      main: '#00CFE8',
      dark: '#00B6CC',
      contrastText: whiteColor
    },
    success: {
      light: '#42CE80',
      main: '#28C76F',
      dark: '#23AF62',
      contrastText: whiteColor
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#F5F5F5',
      A200: '#EEEEEE',
      A400: '#BDBDBD',
      A700: '#616161'
    },
    text: {
      primary: `rgba(${mainColor}, 0.78)`,
      secondary: `rgba(${mainColor}, 0.68)`,
      disabled: `rgba(${mainColor}, 0.42)`
    },
    divider: `rgba(${mainColor}, 0.16)`,
    background: {
      paper: mode === 'light' ? whiteColor : darkPaperBgColor,
      default: defaultBgColor()
    },
    action: {
      active: `rgba(${mainColor}, 0.54)`,
      hover: `rgba(${mainColor}, 0.04)`,
      selected: `rgba(${mainColor}, 0.06)`,
      selectedOpacity: 0.06,
      disabled: `rgba(${mainColor}, 0.26)`,
      disabledBackground: `rgba(${mainColor}, 0.12)`,
      focus: `rgba(${mainColor}, 0.12)`
    }
  } as Palette
}

export default DefaultPalette
