'use client'

/**
 * Account > Preferences -- the Menu/behavior settings from the Customizer
 * drawer (@core/components/customizer) that aren't theming (those live at
 * Account > Theme, see ThemeSettingsView.tsx). Same useSettings() hook,
 * real and persisted, not a scaffold.
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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useSettings } from '@/@core/hooks/useSettings'
import type { Settings } from '@/@core/context/settingsContext'

const TOAST_POSITIONS: NonNullable<Settings['toastPosition']>[] = [
  'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right',
]

export function PreferencesView() {
  const { settings, saveSettings } = useSettings()
  const { navHidden, navCollapsed, verticalNavToggleType, toastPosition, layout } = settings

  function set<K extends keyof Settings>(field: K, value: Settings[K]) {
    saveSettings({ ...settings, [field]: value })
  }

  return (
    <Stack spacing={4}>
      <Card>
        <CardHeader title="Navigation" subheader="Sidebar behavior. Applies immediately." />
        <Divider />
        <CardContent>
          <Stack spacing={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
              <Typography>Hide sidebar navigation</Typography>
              <Switch checked={Boolean(navHidden)} onChange={e => set('navHidden', e.target.checked)} />
            </Box>
            {!navHidden && layout !== 'horizontal' && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
                  <Typography>Start collapsed</Typography>
                  <Switch checked={navCollapsed} onChange={e => set('navCollapsed', e.target.checked)} />
                </Box>
                <Box>
                  <Typography sx={{ mb: 1 }}>Submenu toggle style</Typography>
                  <RadioGroup
                    row
                    value={verticalNavToggleType}
                    onChange={e => set('verticalNavToggleType', e.target.value as Settings['verticalNavToggleType'])}
                  >
                    <FormControlLabel value="accordion" label="Accordion (one open at a time)" control={<Radio />} />
                    <FormControlLabel value="collapse" label="Collapse (independent)" control={<Radio />} />
                  </RadioGroup>
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Notifications Display" subheader="Where toast notifications appear on screen." />
        <Divider />
        <CardContent>
          <TextField
            select
            sx={{ maxWidth: 280 }}
            fullWidth
            label="Toast position"
            value={toastPosition ?? 'top-right'}
            onChange={e => set('toastPosition', e.target.value as Settings['toastPosition'])}
          >
            {TOAST_POSITIONS.map(p => (
              <MenuItem key={p} value={p}>{p.replace('-', ' ')}</MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>
    </Stack>
  )
}
