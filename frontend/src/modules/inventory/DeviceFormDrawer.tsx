'use client'

/**
 * Add/Edit Device form. Same form fields, same isIcmp() gating of the
 * SNMPv3 credential fields, same onSave(Partial<Device>) contract as
 * before -- only restyled to use Vuexy's CustomTextField (which already
 * covers both plain and `select` inputs) instead of plain MUI
 * TextField/Select/FormControl/InputLabel. No logic changes.
 */
import { useState } from 'react'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import CustomTextField from '@/@core/components/mui/text-field'
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

/** Supported device vendors. Extend this list as more platforms are onboarded. */
export const DEVICE_VENDORS = ['Arista', 'Cisco', 'Palo Alto'] as const

export function DeviceFormDrawer({ open, device, onClose, onSave, saving }: DeviceFormDrawerProps) {
  const isNew = !device?.id
  const [form, setForm] = useState<Record<string, string>>({
    IP: device?.IP ?? '',
    Device: String(device?.Device ?? ''),
    'Device Vendor': String(device?.['Device Vendor'] ?? ''),
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
          <Button onClick={handleSave} variant="contained" disabled={!form.IP || !form['Device Vendor'] || saving}>
            {isNew ? 'Add' : 'Save'}
          </Button>
        </>
      }
    >
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <CustomTextField label="IP Address" required fullWidth value={form.IP} onChange={(e) => set('IP', e.target.value)} placeholder="10.0.0.1" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomTextField label="Device Name" fullWidth value={form.Device} onChange={(e) => set('Device', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomTextField
            select
            required
            fullWidth
            label="Device Vendor"
            value={form['Device Vendor']}
            onChange={(e) => set('Device Vendor', e.target.value)}
          >
            <MenuItem value="">— select —</MenuItem>
            {DEVICE_VENDORS.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomTextField label="Collector Region" fullWidth value={form['Collector Region']} onChange={(e) => set('Collector Region', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomTextField
            select
            fullWidth
            label="Config Type"
            value={form['Config Type']}
            onChange={(e) => set('Config Type', e.target.value)}
          >
            <MenuItem value="">— select —</MenuItem>
            <MenuItem value="SNMP">SNMP</MenuItem>
            <MenuItem value="ICMP">ICMP</MenuItem>
            <MenuItem value="SNMP Trap">SNMP Trap</MenuItem>
            <MenuItem value="Storage">Storage</MenuItem>
          </CustomTextField>
        </Grid>

        {!isIcmp && (
          <>
            <Grid item xs={12} sm={6}>
              <CustomTextField label="SNMPv3 Username" fullWidth value={form.snmpUser} onChange={(e) => set('snmpUser', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField label="Auth Protocol" fullWidth placeholder="SHA, MD5…" value={form.authProtocol} onChange={(e) => set('authProtocol', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField label="Auth Password" type="password" fullWidth value={form.authKey} onChange={(e) => set('authKey', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField label="Priv Protocol" fullWidth placeholder="AES, DES…" value={form.privProtocol} onChange={(e) => set('privProtocol', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField label="Priv Password" type="password" fullWidth value={form.privKey} onChange={(e) => set('privKey', e.target.value)} />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <CustomTextField label="Remarks" fullWidth multiline rows={2} value={form.Remarks} onChange={(e) => set('Remarks', e.target.value)} />
        </Grid>
      </Grid>
    </FormDrawer>
  )
}
