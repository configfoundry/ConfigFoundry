'use client'

/** Add/Edit Bandwidth row form. UI-only port of the old BandwidthModal. */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { api } from '@/lib/api'
import type { BandwidthRow, Device } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { FormDrawer } from '@/components/common/FormDrawer'
import { DeviceFormDrawer } from './DeviceFormDrawer'

interface BandwidthFormDrawerProps {
  open: boolean
  row: Partial<BandwidthRow> | null
  onClose: () => void
  onSave: (r: Partial<BandwidthRow>) => void
  saving?: boolean
}

/** Units the backend's parse_bw_to_bps() (core/domain/helpers.py) actually recognizes. */
const BW_UNITS = ['Kbps', 'Mbps', 'Gbps'] as const

/** Split a stored value like "10 Gbps" into its number and unit parts. */
function parseAllocatedBw(value: unknown): { amount: string; unit: string } {
  const str = String(value ?? '').trim()
  const m = str.match(/^([\d.]+)\s*([a-zA-Z]+)$/)
  if (!m) return { amount: str, unit: 'Mbps' }
  const matchedUnit = BW_UNITS.find((u) => u.toLowerCase() === m[2].toLowerCase())
  return { amount: m[1], unit: matchedUnit ?? 'Mbps' }
}

export function BandwidthFormDrawer({ open, row, onClose, onSave, saving }: BandwidthFormDrawerProps) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const initialBw = parseAllocatedBw(row?.['Allocated BW'])

  const [form, setForm] = useState({
    IP: row?.IP ?? '',
    Interface: String(row?.Interface ?? ''),
    bwAmount: initialBw.amount,
    bwUnit: initialBw.unit,
    Interface_description: String(row?.Interface_description ?? ''),
  })
  const [addDeviceOpen, setAddDeviceOpen] = useState(false)

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
  })
  const devices = useMemo(() => devicesData?.devices ?? [], [devicesData])
  const selectedDevice = useMemo(() => devices.find((d) => d.IP === form.IP) ?? null, [devices, form.IP])

  const addDeviceMut = useMutation({
    mutationFn: (d: Partial<Device>) => api.upsertDevice(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      set('IP', res.device.IP)
      setAddDeviceOpen(false)
      toast('Device added', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    const allocatedBw = form.bwAmount ? `${form.bwAmount} ${form.bwUnit}` : ''
    const out: Partial<BandwidthRow> = {
      IP: form.IP,
      Interface: form.Interface,
      'Allocated BW': allocatedBw,
      Interface_description: form.Interface_description,
    }
    if (row?.id) out.id = row.id
    onSave(out)
  }

  return (
    <>
      <FormDrawer
        open={open}
        title={row?.id ? 'Edit Row' : 'Add Row'}
        onClose={onClose}
        actions={
          <>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button onClick={save} variant="contained" disabled={!form.IP || saving}>
              Save
            </Button>
          </>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              size="small"
              options={devices}
              value={selectedDevice}
              getOptionLabel={(opt) => `${opt.IP}${opt.Device ? ` — ${opt.Device}` : ''}`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onChange={(_e, val) => set('IP', val?.IP ?? '')}
              renderOption={(props, option: Device) => (
                <Box component="li" {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.IP}</Typography>
                    {option.Device && (
                      <Typography variant="caption" color="text.secondary">
                        {option.Device}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Device"
                  required
                  fullWidth
                  placeholder="Select a device from inventory"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label="Add new device"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAddDeviceOpen(true)
                            }}
                          >
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Interface"
              fullWidth
              size="small"
              value={form.Interface}
              onChange={(e) => set('Interface', e.target.value)}
              placeholder='As it appears in the device config, e.g. "Eth 41"'
              helperText="Must match the interface name/index in the device's running config."
            />
          </Grid>
          <Grid item xs={7}>
            <TextField
              label="Allocated Bandwidth"
              type="number"
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 'any' }}
              value={form.bwAmount}
              onChange={(e) => set('bwAmount', e.target.value)}
            />
          </Grid>
          <Grid item xs={5}>
            <TextField
              select
              label="Unit"
              fullWidth
              size="small"
              value={form.bwUnit}
              onChange={(e) => set('bwUnit', e.target.value)}
            >
              {BW_UNITS.map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              size="small"
              value={form.Interface_description}
              onChange={(e) => set('Interface_description', e.target.value)}
            />
          </Grid>
        </Grid>
      </FormDrawer>

      {addDeviceOpen && (
        <DeviceFormDrawer
          open
          device={null}
          onClose={() => setAddDeviceOpen(false)}
          onSave={(d) => addDeviceMut.mutate(d)}
          saving={addDeviceMut.isPending}
        />
      )}
    </>
  )
}
