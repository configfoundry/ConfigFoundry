'use client'

/**
 * Add/Edit Device form. UI-only port of the old DeviceModal -- same form
 * fields, same isIcmp() gating of the SNMPv3 credential fields, same
 * onSave(Partial<Device>) contract.
 */
import { useState } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import type { Device } from '@/lib/types'
import { FormDrawer } from '@/components/common/FormDrawer'

interface DeviceFormDrawerProps {
  open: boolean
  device: Partial<Device> | null
  onClose: () => void
  onSave: (d: Partial<Device>) => void
  saving?: boolean
}

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

export function DeviceFormDrawer({ open, device, onClose, onSave, saving }: DeviceFormDrawerProps) {
  const isNew = !device?.id
  const [form, setForm] = useState<Record<string, string>>({
    IP: device?.IP ?? '',
    Device: String(device?.Device ?? ''),
    'Collector Region': String(device?.['Collector Region'] ?? ''),
    'Config Type': String(device?.['Config Type'] ?? ''),
    snmpUser: String(device?.snmpUser ?? ''),
    authProtocol: String(device?.authProtocol ?? ''),
    authKey: String(device?.authKey ?? ''),
    privProtocol: String(device?.privProtocol ?? ''),
    privKey: String(device?.privKey ?? ''),
    Remarks: String(device?.Remarks ?? ''),
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSave() {
    const out: Partial<Device> = { ...form }
    if (device?.id) out.id = device.id
    onSave(out)
  }

  const configType = (form['Config Type'] || '').toLowerCase().trim()
  const isIcmp = ICMP_TYPES.has(configType)

  return (
    <FormDrawer
      open={open}
      title={isNew ? 'Add Device' : 'Edit Device'}
      onClose={onClose}
      width={480}
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.IP || saving}>
            {isNew ? 'Add' : 'Save'}
          </Button>
        </>
      }
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField label="IP Address" required fullWidth size="small" value={form.IP} onChange={(e) => set('IP', e.target.value)} placeholder="10.0.0.1" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Device Name" fullWidth size="small" value={form.Device} onChange={(e) => set('Device', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Collector Region" fullWidth size="small" value={form['Collector Region']} onChange={(e) => set('Collector Region', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth size="small">
            <InputLabel id="config-type-label">Config Type</InputLabel>
            <Select
              labelId="config-type-label"
              label="Config Type"
              value={form['Config Type']}
              onChange={(e) => set('Config Type', e.target.value)}
            >
              <MenuItem value="">— select —</MenuItem>
              <MenuItem value="SNMP">SNMP</MenuItem>
              <MenuItem value="ICMP">ICMP</MenuItem>
              <MenuItem value="SNMP Trap">SNMP Trap</MenuItem>
              <MenuItem value="Storage">Storage</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {!isIcmp && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField label="SNMPv3 Username" fullWidth size="small" value={form.snmpUser} onChange={(e) => set('snmpUser', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Auth Protocol" fullWidth size="small" placeholder="SHA, MD5…" value={form.authProtocol} onChange={(e) => set('authProtocol', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Auth Password" type="password" fullWidth size="small" value={form.authKey} onChange={(e) => set('authKey', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Priv Protocol" fullWidth size="small" placeholder="AES, DES…" value={form.privProtocol} onChange={(e) => set('privProtocol', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Priv Password" type="password" fullWidth size="small" value={form.privKey} onChange={(e) => set('privKey', e.target.value)} />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <TextField label="Remarks" fullWidth size="small" multiline rows={2} value={form.Remarks} onChange={(e) => set('Remarks', e.target.value)} />
        </Grid>
      </Grid>
    </FormDrawer>
  )
}
