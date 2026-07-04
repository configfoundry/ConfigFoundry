'use client'

/** Add/Edit Bandwidth row form. UI-only port of the old BandwidthModal. */
import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import type { BandwidthRow } from '@/lib/types'
import { FormDrawer } from '@/components/common/FormDrawer'

interface BandwidthFormDrawerProps {
  open: boolean
  row: Partial<BandwidthRow> | null
  onClose: () => void
  onSave: (r: Partial<BandwidthRow>) => void
  saving?: boolean
}

export function BandwidthFormDrawer({ open, row, onClose, onSave, saving }: BandwidthFormDrawerProps) {
  const [form, setForm] = useState({
    IP: row?.IP ?? '',
    Interface: String(row?.Interface ?? ''),
    'Allocated BW': String(row?.['Allocated BW'] ?? ''),
    Interface_description: String(row?.Interface_description ?? ''),
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    const out: Partial<BandwidthRow> = { ...form }
    if (row?.id) out.id = row.id
    onSave(out)
  }

  return (
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
          <TextField label="IP Address" required fullWidth size="small" value={form.IP} onChange={(e) => set('IP', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Interface" fullWidth size="small" value={form.Interface} onChange={(e) => set('Interface', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Allocated BW" fullWidth size="small" value={form['Allocated BW']} onChange={(e) => set('Allocated BW', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Description" fullWidth size="small" value={form.Interface_description} onChange={(e) => set('Interface_description', e.target.value)} />
        </Grid>
      </Grid>
    </FormDrawer>
  )
}
