'use client'

// MUI rewrite of the old app/(app)/settings/page.tsx MfaCard -- same
// api.auth.mfaEnrollBegin/Confirm/Disable calls, same enroll -> confirm ->
// backup-codes flow, new look and new home (Account > MFA).
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import { api, ApiError } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

export function MfaCard() {
  const { toast } = useToast()
  const { user, refreshUser } = useAuth()
  const [enrolling, setEnrolling] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const beginMut = useMutation({
    mutationFn: () => api.auth.mfaEnrollBegin(),
    onSuccess: (r) => {
      setSecret(r.secret)
      setProvisioningUri(r.provisioning_uri)
      setEnrolling(true)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to start MFA enrollment', 'error'),
  })

  const confirmMut = useMutation({
    mutationFn: () => api.auth.mfaEnrollConfirm(secret!, code.trim()),
    onSuccess: (r) => {
      setBackupCodes(r.backup_codes)
      setEnrolling(false)
      setCode('')
      refreshUser()
      toast('MFA enabled', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Invalid code', 'error'),
  })

  const disableMut = useMutation({
    mutationFn: () => api.auth.mfaDisable(),
    onSuccess: () => {
      refreshUser()
      toast('MFA disabled', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to disable MFA', 'error'),
  })

  return (
    <Card>
      <CardHeader
        title="Authenticator app"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        action={
          user?.mfa_enabled
            ? <Chip label="Enabled" color="success" size="small" />
            : <Chip label="Disabled" size="small" />
        }
      />
      <Divider />
      <CardContent>
        {backupCodes ? (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Save these backup codes now -- each can be used once if you lose access to your
              authenticator app. They will not be shown again.
            </Alert>
            <Grid container spacing={1} sx={{ fontFamily: 'monospace', mb: 3, maxWidth: 320 }}>
              {backupCodes.map((c) => (
                <Grid item xs={6} key={c}><Typography variant="body2" fontFamily="monospace">{c}</Typography></Grid>
              ))}
            </Grid>
            <Button variant="outlined" onClick={() => setBackupCodes(null)}>Done</Button>
          </Box>
        ) : user?.mfa_enabled ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Two-factor authentication is protecting this account.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              disabled={disableMut.isPending}
              onClick={() => {
                if (confirm('Disable two-factor authentication for your account?')) disableMut.mutate()
              }}
            >
              {disableMut.isPending ? 'Disabling…' : 'Disable MFA'}
            </Button>
          </Box>
        ) : !enrolling ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add an authenticator app (Google Authenticator, 1Password, Authy) as a second factor for sign-in.
            </Typography>
            <Button variant="contained" disabled={beginMut.isPending} onClick={() => beginMut.mutate()}>
              {beginMut.isPending ? 'Starting…' : 'Enroll MFA'}
            </Button>
          </Box>
        ) : (
          <Stack spacing={3} maxWidth="sm">
            <Typography variant="body2" color="text.secondary">
              Add this key to your authenticator app manually, or paste the URI below into an app that supports it.
            </Typography>
            <TextField
              fullWidth
              label="Secret key"
              value={secret ?? ''}
              InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }}
              onClick={(e) => (e.target as HTMLInputElement).select?.()}
            />
            <TextField
              fullWidth
              label="Setup URI"
              value={provisioningUri ?? ''}
              InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }}
              onClick={(e) => (e.target as HTMLInputElement).select?.()}
            />
            <TextField
              fullWidth
              label="Enter the 6-digit code to confirm"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Stack direction="row" spacing={2}>
              <Button variant="contained" disabled={!code || confirmMut.isPending} onClick={() => confirmMut.mutate()}>
                {confirmMut.isPending ? 'Confirming…' : 'Confirm'}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setEnrolling(false)
                  setSecret(null)
                  setProvisioningUri(null)
                  setCode('')
                }}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
