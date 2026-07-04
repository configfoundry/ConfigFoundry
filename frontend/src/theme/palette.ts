// ---------------------------------------------------------------------------
// Vuexy design tokens (color palette only).
//
// Source of truth: theme/react-version/nextjs-mui/typescript-version/starter-kit
// (the licensed Vuexy Next.js + MUI template) -- src/@core/theme/palette/index.ts.
// We do NOT import that template's code; we port the token *values* so the
// licensed template folder never has to ship as a runtime dependency.
// ---------------------------------------------------------------------------

export const vuexyColors = {
  primary: { light: '#8479F2', main: '#7367F0', dark: '#655BD3' },
  secondary: { light: '#B2B4B8', main: '#A8AAAE', dark: '#949699' },
  error: { light: '#ED6F70', main: '#EA5455', dark: '#CE4A4B' },
  warning: { light: '#FFAB5A', main: '#FF9F43', dark: '#E08C3B' },
  info: { light: '#1FD5EB', main: '#00CFE8', dark: '#00B6CC' },
  success: { light: '#42CE80', main: '#28C76F', dark: '#23AF62' },
}

export const darkPaletteTokens = {
  mode: 'dark' as const,
  background: {
    default: '#25293C',
    paper: '#2F3349',
  },
  text: {
    primary: 'rgba(231, 227, 252, 0.87)',
    secondary: 'rgba(231, 227, 252, 0.68)',
    disabled: 'rgba(231, 227, 252, 0.4)',
  },
  divider: 'rgba(231, 227, 252, 0.12)',
}

export const lightPaletteTokens = {
  mode: 'light' as const,
  background: {
    default: '#F7F7F9',
    paper: '#FFFFFF',
  },
  text: {
    primary: 'rgba(50, 47, 71, 0.87)',
    secondary: 'rgba(50, 47, 71, 0.68)',
    disabled: 'rgba(50, 47, 71, 0.4)',
  },
  divider: 'rgba(50, 47, 71, 0.12)',
}
