'use client'

/**
 * Account > Theme -- a full-page version of the same real, working
 * settings the floating Customizer drawer (@core/components/customizer)
 * already exposes: same useSettings() hook, same Settings fields, same
 * saveSettings() persistence (localStorage, see settingsContext.tsx). Not a
 * scaffold -- every control here changes the live theme immediately,
 * exactly like the drawer does. This just gives those controls a permanent,
 * discoverable home under Account instead of only a slide-out panel.
 */
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'
import { useSettings } from '@/@core/hooks/useSettings'
import type { Settings } from '@/@core/context/settingsContext'

const ColorBox = styled(Box)<BoxProps>(({ theme }) => ({
  width: 40,
  height: 40,
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  border: `2px solid transparent`,
  transition: 'transform .15s ease-in-out, box-shadow .15s ease-in-out',
  '&:hover': { boxShadow: theme.shadows[4] },
}))

const THEME_COLORS: { key: Settings['themeColor']; swatch: string }[] = [
  { key: 'primary', swatch: '#7367F0' },
  { key: 'secondary', swatch: 'secondary.main' },
  { key: 'success', swatch: 'success.main' },
  { key: 'error', swatch: 'error.main' },
  { key: 'warning', swatch: 'warning.main' },
  { key: 'info', swatch: 'info.main' },
]

export function ThemeSettingsView() {
  const { settings, saveSettings } = useSettings()
  const { mode, skin, appBar, footer, layout, appBarBlur, themeColor, contentWidth } = settings

  function set<K extends keyof Settings>(field: K, value: Settings[K]) {
    saveSettings({ ...settings, [field]: value })
  }

  return (
    <Stack spacing={4}>
      <Card>
        <CardHeader title="Theming" />
        <Divider />
        <CardContent>
          <Stack spacing={4}>
            <Box>
              <Typography sx={{ mb: 1 }}>Mode</Typography>
              <RadioGroup row value={mode} onChange={e => set('mode', e.target.value as Settings['mode'])}>
                <FormControlLabel value="light" label="Light" control={<Radio />} />
                <FormControlLabel value="dark" label="Dark" control={<Radio />} />
                {layout !== 'horizontal' && <FormControlLabel value="semi-dark" label="Semi Dark" control={<Radio />} />}
              </RadioGroup>
            </Box>
            <Box>
              <Typography sx={{ mb: 1 }}>Skin</Typography>
              <RadioGroup row value={skin} onChange={e => set('skin', e.target.value as Settings['skin'])}>
                <FormControlLabel value="default" label="Default" control={<Radio />} />
                <FormControlLabel value="bordered" label="Bordered" control={<Radio />} />
              </RadioGroup>
            </Box>
            <Box>
              <Typography sx={{ mb: 1.5 }}>Primary Color</Typography>
              <Stack direction="row" spacing={2}>
                {THEME_COLORS.map(c => (
                  <ColorBox
                    key={c.key}
                    onClick={() => set('themeColor', c.key)}
                    sx={{
                      backgroundColor: c.swatch,
                      ...(themeColor === c.key ? { width: 46, height: 46, boxShadow: 4 } : {}),
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Layout" />
        <Divider />
        <CardContent>
          <Stack spacing={4}>
            <Box>
              <Typography sx={{ mb: 1 }}>Content Width</Typography>
              <RadioGroup row value={contentWidth} onChange={e => set('contentWidth', e.target.value as Settings['contentWidth'])}>
                <FormControlLabel value="full" label="Full" control={<Radio />} />
                <FormControlLabel value="boxed" label="Boxed" control={<Radio />} />
              </RadioGroup>
            </Box>
            <Box>
              <Typography sx={{ mb: 1 }}>AppBar Type</Typography>
              <RadioGroup row value={appBar} onChange={e => set('appBar', e.target.value as Settings['appBar'])}>
                <FormControlLabel value="fixed" label="Fixed" control={<Radio />} />
                <FormControlLabel value="static" label="Static" control={<Radio />} />
                {layout !== 'horizontal' && <FormControlLabel value="hidden" label="Hidden" control={<Radio />} />}
              </RadioGroup>
            </Box>
            <Box>
              <Typography sx={{ mb: 1 }}>Footer Type</Typography>
              <RadioGroup row value={footer} onChange={e => set('footer', e.target.value as Settings['footer'])}>
                <FormControlLabel value="fixed" label="Fixed" control={<Radio />} />
                <FormControlLabel value="static" label="Static" control={<Radio />} />
                <FormControlLabel value="hidden" label="Hidden" control={<Radio />} />
              </RadioGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 320 }}>
              <Typography>AppBar Blur</Typography>
              <Switch checked={appBarBlur} onChange={e => set('appBarBlur', e.target.checked)} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
