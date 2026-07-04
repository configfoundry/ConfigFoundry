'use client'

/**
 * Shared shell for System settings pages that don't have a backend yet
 * (Database, Storage, SMTP, Authentication, Integrations, Licensing,
 * Backup & Restore). Renders ONE dense Card with each config group as an
 * internal section (divider-separated), and a single Save action for the
 * whole page -- the first version of this rendered one full Card per
 * section, each with its own Save button, which duplicated the CTA and
 * wasted vertical space (UX refinement pass). Local-only state; a compact
 * inline banner (not a full-width Alert) names the TODO endpoint.
 *
 * Global Settings and Security Policies are NOT built on this shell -- they
 * wrap real, already-existing functionality (tag management / IP policies)
 * and have their own pages.
 */
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Icon from '@/@core/components/icon'
import { useToast } from '@/components/ui/Toast'

export type ScaffoldFieldType = 'text' | 'password' | 'number' | 'select' | 'switch'

export interface ScaffoldField {
  name: string
  label: string
  type: ScaffoldFieldType
  helper?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | boolean
  gridWidth?: number
}

export interface ScaffoldSection {
  title: string
  description?: string
  fields: ScaffoldField[]
}

interface Props {
  todoEndpoint: string
  sections: ScaffoldSection[]
  primaryActionLabel?: string
}

export function SystemSettingsScaffold({ todoEndpoint, sections, primaryActionLabel = 'Save Changes' }: Props) {
  const { toast } = useToast()
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {}
    for (const section of sections) {
      for (const field of section.fields) {
        initial[field.name] = field.defaultValue ?? (field.type === 'switch' ? false : '')
      }
    }
    return initial
  })

  function set(name: string, value: string | boolean) {
    setValues(v => ({ ...v, [name]: value }))
  }

  function handleSave() {
    toast(`Not connected to a backend yet -- nothing was saved.`, 'error')
  }

  return (
    <Card>
      <CardContent sx={{ pb: 2 }}>
        <Chip
          size="small"
          variant="outlined"
          color="warning"
          icon={<Icon icon="tabler:alert-triangle" fontSize="0.9rem" />}
          label={`Not connected -- TODO: ${todoEndpoint}`}
          sx={{ mb: 4 }}
        />
        {sections.map((section, i) => (
          <Box key={section.title}>
            {i > 0 && <Divider sx={{ my: 5 }} />}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: section.description ? 0.5 : 3 }}>
              {section.title}
            </Typography>
            {section.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {section.description}
              </Typography>
            )}
            <Grid container spacing={4}>
              {section.fields.map(field => (
                <Grid item xs={12} sm={field.gridWidth ?? 6} key={field.name}>
                  {field.type === 'switch' ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(values[field.name])}
                          onChange={e => set(field.name, e.target.checked)}
                        />
                      }
                      label={field.label}
                    />
                  ) : field.type === 'select' ? (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={field.label}
                      value={values[field.name]}
                      helperText={field.helper}
                      onChange={e => set(field.name, e.target.value)}
                    >
                      {(field.options ?? []).map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                      label={field.label}
                      value={values[field.name]}
                      helperText={field.helper}
                      onChange={e => set(field.name, e.target.value)}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end', py: 3, px: 5 }}>
        <Button variant="contained" onClick={handleSave}>{primaryActionLabel}</Button>
      </CardActions>
    </Card>
  )
}
