'use client'

/**
 * Login + 2FA view.
 *
 * UI-only migration to MUI/Vuexy. Business logic is an exact port of the
 * pre-migration app/(auth)/login/page.tsx:
 *  - Same two states (credentials form -> optional MFA form), driven by
 *    whether login() returns { mfaRequired: true }.
 *  - Same useAuth().login() / completeMfa() calls, same ApiError handling.
 *  - Same redirect target ('/') on success.
 *  - Same existing useToast() (components/ui/Toast) for error feedback --
 *    that provider is used by 8 other not-yet-migrated pages, so it is
 *    intentionally left where it is and NOT restyled in this pass; only
 *    consumed here.
 *
 * Additions are presentation-only: inline required/format validation
 * (nothing is sent to the API that wasn't sent before), a password
 * visibility toggle, and MUI loading affordances on the submit buttons.
 *
 * Out of scope (no backend support -- see chat): Forgot Password,
 * Reset Password, Verify Email. Only Login + 2FA exist as real,
 * API-backed flows today.
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useAuth } from '@/providers/AuthProvider'
import { ApiError } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginView() {
  const router = useRouter()
  const { login, completeMfa } = useAuth()
  const { toast } = useToast()

  // --- credentials step ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  // --- MFA step ---
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)

  const emailError = touched && !email ? 'Email is required' : touched && !EMAIL_RE.test(email) ? 'Enter a valid email address' : ''
  const passwordError = touched && !password ? 'Password is required' : ''
  const codeError = codeTouched && !code.trim() ? 'Verification code is required' : ''

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!email || !EMAIL_RE.test(email) || !password) return

    setBusy(true)
    try {
      const result = await login(email, password)
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken)
      } else {
        router.push('/')
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Login failed. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault()
    setCodeTouched(true)
    if (!mfaToken || !code.trim()) return

    setBusy(true)
    try {
      await completeMfa(mfaToken, code.trim())
      router.push('/')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Verification failed. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {mfaToken ? 'Two-factor verification' : 'Sign in'}
        </Typography>
        {mfaToken && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the 6-digit code from your authenticator app, or a backup code.
          </Typography>
        )}
        {!mfaToken && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your ConfigFoundry account.
          </Typography>
        )}

        {!mfaToken ? (
          <Box component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={2.5}>
              <TextField
                id="email"
                name="email"
                label="Email"
                type="email"
                autoComplete="username"
                autoFocus
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(emailError)}
                helperText={emailError || ' '}
                disabled={busy}
              />
              <TextField
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={Boolean(passwordError)}
                helperText={passwordError || ' '}
                disabled={busy}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleMfa} noValidate>
            <Stack spacing={2.5}>
              <TextField
                id="mfa-code"
                name="mfa-code"
                label="Verification code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                fullWidth
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={Boolean(codeError)}
                helperText={codeError || ' '}
                disabled={busy}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {busy ? 'Verifying…' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="text"
                size="small"
                disabled={busy}
                onClick={() => {
                  setMfaToken(null)
                  setCode('')
                  setCodeTouched(false)
                }}
              >
                Back to sign in
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
