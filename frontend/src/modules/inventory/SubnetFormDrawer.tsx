'use client'

/** Add/Edit Subnet form. UI-only port of the old SubnetModal. */
import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import type { Subnet } from '@/lib/types'
import { FormDrawer } from '@/components/common/FormDrawer'

interface SubnetFormDrawerProps {
  open: boolean
  subnet: Partial<Subnet> | null
  onClose: () => void
  onSave: (s: Partial<Subnet>) => void
  saving?: boolean
}

export function SubnetFormDrawer({ open, subnet, onClose, onSave, saving }: SubnetFormDrawerProps) {
  const [form, setForm] = useState({
    CIDR: subnet?.CIDR ?? '',
    Description: String(subnet?.Description ?? ''),
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    const out: Partial<Subnet> = { ...form }
    if (subnet?.id) out.id = subnet.id
    onSave(out)
  }

  return (
    <FormDrawer
      open={open}
      title={subnet?.id ? 'Edit Subnet' : 'Add Subnet'}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={save} variant="contained" disabled={!form.CIDR || saving}>
            Save
          </Button>
        </>
      }
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField label="CIDR" required fullWidth size="small" value={form.CIDR} onChange={(e) => set('CIDR', e.target.value)} placeholder="192.168.0.0/24" />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Description" fullWidth size="small" value={form.Description} onChange={(e) => set('Description', e.target.value)} />
        </Grid>
      </Grid>
    </FormDrawer>
  )
}
