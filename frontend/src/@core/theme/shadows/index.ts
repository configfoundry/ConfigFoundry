// ** Type Imports
import { PaletteMode, ThemeOptions } from '@mui/material'

// Light-mode shadow ink pixel-matched to '75, 70, 92' -- the licensed Vuexy
// Bootstrap5 HTML edition's own --bs-card-box-shadow color
// (assets/vendor/css/rtl/core.css), at the user's explicit request. Was
// '47, 43, 61' (this React/MUI port's original tone, still a valid Vuexy
// value, just a different per-edition choice). Matching change in
// ../palette/index.ts's lightColor. Dark-mode shadow ink ('15, 20, 34')
// already matched that same Bootstrap5 edition's dark card shadow exactly,
// so it's untouched here; its shadow OPACITY is deliberately left as-is too
// (Bootstrap5's dark card shadow uses a much stronger 0.4 opacity, but
// hardcoding that onto just this array's card-elevation entry (7) alone
// would make it darker than higher-elevation entries above it in the same
// scale, breaking the elevation ordering -- flagging this as a known,
// intentionally-unaddressed minor gap rather than silently forcing an
// inconsistent fix).
const Shadows = (mode: PaletteMode): ThemeOptions['shadows'] => {
  if (mode === 'light') {
    return [
      'none',
      '0px 2px 4px 0px rgba(75, 70, 92, 0.12)',
      '0px 2px 6px 0px rgba(75, 70, 92, 0.14)',
      '0px 3px 8px 0px rgba(75, 70, 92, 0.14)',
      '0px 3px 9px 0px rgba(75, 70, 92, 0.15)',
      '0px 4px 10px 0px rgba(75, 70, 92, 0.15)',
      '0px 4px 11px 0px rgba(75, 70, 92, 0.16)',
      '0px 4px 18px 0px rgba(75, 70, 92, 0.1)',
      '0px 4px 13px 0px rgba(75, 70, 92, 0.18)',
      '0px 5px 14px 0px rgba(75, 70, 92, 0.18)',
      '0px 5px 15px 0px rgba(75, 70, 92, 0.2)',
      '0px 5px 16px 0px rgba(75, 70, 92, 0.2)',
      '0px 6px 17px 0px rgba(75, 70, 92, 0.22)',
      '0px 6px 18px 0px rgba(75, 70, 92, 0.22)',
      '0px 6px 19px 0px rgba(75, 70, 92, 0.24)',
      '0px 7px 20px 0px rgba(75, 70, 92, 0.24)',
      '0px 7px 21px 0px rgba(75, 70, 92, 0.26)',
      '0px 7px 22px 0px rgba(75, 70, 92, 0.26)',
      '0px 8px 23px 0px rgba(75, 70, 92, 0.28)',
      '0px 8px 24px 6px rgba(75, 70, 92, 0.28)',
      '0px 9px 25px 0px rgba(75, 70, 92, 0.3)',
      '0px 9px 26px 0px rgba(75, 70, 92, 0.32)',
      '0px 9px 27px 0px rgba(75, 70, 92, 0.32)',
      '0px 10px 28px 0px rgba(75, 70, 92, 0.34)',
      '0px 10px 30px 0px rgba(75, 70, 92, 0.34)'
    ]
  } else {
    return [
      'none',
      '0px 2px 4px 0px rgba(15, 20, 34, 0.12)',
      '0px 2px 6px 0px rgba(15, 20, 34, 0.14)',
      '0px 3px 8px 0px rgba(15, 20, 34, 0.14)',
      '0px 3px 9px 0px rgba(15, 20, 34, 0.15)',
      '0px 4px 10px 0px rgba(15, 20, 34, 0.15)',
      '0px 4px 11px 0px rgba(15, 20, 34, 0.16)',
      '0px 4px 18px 0px rgba(15, 20, 34, 0.1)',
      '0px 4px 13px 0px rgba(15, 20, 34, 0.18)',
      '0px 5px 14px 0px rgba(15, 20, 34, 0.18)',
      '0px 5px 15px 0px rgba(15, 20, 34, 0.2)',
      '0px 5px 16px 0px rgba(15, 20, 34, 0.2)',
      '0px 6px 17px 0px rgba(15, 20, 34, 0.22)',
      '0px 6px 18px 0px rgba(15, 20, 34, 0.22)',
      '0px 6px 19px 0px rgba(15, 20, 34, 0.24)',
      '0px 7px 20px 0px rgba(15, 20, 34, 0.24)',
      '0px 7px 21px 0px rgba(15, 20, 34, 0.26)',
      '0px 7px 22px 0px rgba(15, 20, 34, 0.26)',
      '0px 8px 23px 0px rgba(15, 20, 34, 0.28)',
      '0px 8px 24px 6px rgba(15, 20, 34, 0.28)',
      '0px 9px 25px 0px rgba(15, 20, 34, 0.3)',
      '0px 9px 26px 0px rgba(15, 20, 34, 0.32)',
      '0px 9px 27px 0px rgba(15, 20, 34, 0.32)',
      '0px 10px 28px 0px rgba(15, 20, 34, 0.34)',
      '0px 10px 30px 0px rgba(15, 20, 34, 0.34)'
    ]
  }
}
export default Shadows
