'use client'

// MUI rewrite of the old app/(app)/settings/page.tsx ChangePasswordCard --
// same api.auth.changePassword() call, same validation, new look and new
// home (Account > Profile instead of Settings > Security).
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { api, ApiError } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

export function ChangePasswordCard() {
  const { toast } = useToast()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const mut = useMutation({
    mutationFn: () => api.auth.changePassword(oldPw, newPw),
    onSuccess: () => {
      toast('Password changed', 'success')
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to change password', 'error'),
  })

  const mismatch = newPw.length > 0 && confirmPw.length > 0 && newPw !== confirmPw

  return (
    <Card>
      <CardHeader title="Change Password" />
      <Divider />
      <CardContent>
        <Grid container spacing={4} maxWidth="sm">
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Current password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="New password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              error={mismatch}
              helperText={mismatch ? 'Passwords do not match' : ' '}
            />
          </Grid>
          <Grid item xs={12}>
            <Box>
              <Button
                variant="contained"
                disabled={!oldPw || !newPw || mismatch || mut.isPending}
                onClick={() => mut.mutate()}
              >
                {mut.isPending ? 'Saving…' : 'Update Password'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
