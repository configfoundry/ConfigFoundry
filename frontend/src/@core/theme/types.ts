declare module '@mui/material/styles' {
  interface Palette {
    customColors: {
      // Deliberately NOT named `dark`/`light` -- see the comment above this
      // object's construction in @core/theme/palette/index.ts: that shape
      // collides with MUI's own Switch/Alert auto-color-variant discovery
      // (`Object.entries(theme.palette).filter(v => v.main && v.light)`)
      // and crashes every Switch/Alert on the page.
      darkChannel: string
      main: string
      lightChannel: string
      bodyBg: string
      trackBg: string
      avatarBg: string
      darkPaperBg: string
      lightPaperBg: string
      tableHeaderBg: string
    }
  }
  interface PaletteOptions {
    customColors?: {
      darkChannel?: string
      main?: string
      lightChannel?: string
      bodyBg?: string
      trackBg?: string
      avatarBg?: string
      darkPaperBg?: string
      lightPaperBg?: string
      tableHeaderBg?: string
    }
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/material/ButtonGroup' {
  interface ButtonGroupPropsVariantOverrides {
    tonal: true
  }
}

export {}
