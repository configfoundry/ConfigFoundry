'use client'

/**
 * Login + 2FA view -- ported into Vuexy's actual split-screen login page
 * (pages/login/index.tsx in the licensed bundle), not a from-scratch MUI
 * card like the previous pass.
 *
 * Reused from Vuexy verbatim: @core/layouts/BlankLayout (applied one level up,
 * in app/(auth)/layout.tsx), @core/components/mui/text-field (CustomTextField),
 * @core/components/icon, views/pages/auth/FooterIllustrationsV2, and the real
 * illustration/mask PNGs shipped with the bundle.
 *
 * Business logic is UNCHANGED from the prior pass, which was itself an exact
 * port of the pre-migration app/(auth)/login/page.tsx:
 *  - Same two states (credentials form -> optional MFA form), driven by
 *    whether login() returns { mfaRequired: true }.
 *  - Same useAuth().login() / completeMfa() calls, same ApiError handling.
 *  - Same redirect target ('/') on success.
 *  - Same existing useToast() (components/ui/Toast) for error feedback.
 *
 * Removed (Vuexy demo content, not ConfigFoundry features):
 *  - Hardcoded demo credentials alert.
 *  - Facebook/Twitter/GitHub/Google social login icons (dead links, no
 *    OAuth backend).
 *  - "Remember Me" checkbox (no such concept in the real auth flow).
 *  - "Create an account" / register link (no register endpoint).
 *  - "Forgot Password?" link (no backend support -- see chat history).
 * Branding: Vuexy's own brand mark + "Welcome to Vuexy!" replaced with the
 * same "CF" monogram used in the sidebar header + "Welcome to ConfigFoundry!".
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Box, { type BoxProps } from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import CustomTextField from '@/@core/components/mui/text-field'
import Icon from '@/@core/components/icon'
import FooterIllustrationsV2 from '@/views/pages/auth/FooterIllustrationsV2'
import { useAuth } from '@/providers/AuthProvider'
import { ApiError } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import themeConfig from '@/configs/themeConfig'
import { useSettings } from '@/@core/hooks/useSettings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ** Styled Components -- same structure/spacing as Vuexy's pages/login/index.tsx
const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  maxHeight: 680,
  marginTop: theme.spacing(12),
  marginBottom: theme.spacing(12),
  [theme.breakpoints.down(1540)]: {
    maxHeight: 550,
  },
  [theme.breakpoints.down('lg')]: {
    maxHeight: 500,
  },
}))

const RightWrapper = styled(Box)<BoxProps>(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('md')]: {
    maxWidth: 450,
  },
  [theme.breakpoints.up('lg')]: {
    maxWidth: 600,
  },
  [theme.breakpoints.up('xl')]: {
    maxWidth: 750,
  },
}))

export function LoginView() {
  const router = useRouter()
  const { login, completeMfa } = useAuth()
  const { toast } = useToast()
  const theme = useTheme()
  const { settings } = useSettings()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  // Matches Vuexy's own skin-aware illustration selection (Customizer's
  // "Skin: Default/Bordered" toggle swaps the illustration variant too).
  const imageSource = settings.skin === 'bordered' ? 'auth-v2-login-illustration-bordered' : 'auth-v2-login-illustration'

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
    <Box className="content-right" sx={{ backgroundColor: 'background.paper' }}>
      {!hidden ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
            borderRadius: '20px',
            justifyContent: 'center',
            backgroundColor: 'customColors.bodyBg',
            margin: (t) => t.spacing(8, 0, 8, 8),
          }}
        >
          <LoginIllustration alt="login-illustration" src={`/images/pages/${imageSource}-${theme.palette.mode}.png`} />
          <FooterIllustrationsV2 />
        </Box>
      ) : null}
      <RightWrapper>
        <Box sx={{ p: [6, 12], height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>CF</Typography>
            </Box>
            <Box sx={{ my: 6 }}>
              <Typography variant="h3" sx={{ mb: 1.5 }}>
                {mfaToken ? 'Two-factor verification' : `Welcome to ${themeConfig.templateName}! 👋🏻`}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {mfaToken
                  ? 'Enter the 6-digit code from your authenticator app, or a backup code.'
                  : 'Please sign in to your account to continue'}
              </Typography>
            </Box>

            {!mfaToken ? (
              <form noValidate autoComplete="off" onSubmit={handleLogin}>
                <Stack spacing={4}>
                  <CustomTextField
                    fullWidth
                    autoFocus
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={Boolean(emailError)}
                    helperText={emailError || ' '}
                    disabled={busy}
                  />
                  <CustomTextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={Boolean(passwordError)}
                    helperText={passwordError || ' '}
                    disabled={busy}
                    type={showPassword ? 'text' : 'password'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            <Icon fontSize="1.25rem" icon={showPassword ? 'tabler:eye-off' : 'tabler:eye'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={busy}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {busy ? 'Signing in…' : 'Login'}
                  </Button>
                </Stack>
              </form>
            ) : (
              <form noValidate autoComplete="off" onSubmit={handleMfa}>
                <Stack spacing={4}>
                  <CustomTextField
                    fullWidth
                    autoFocus
                    id="mfa-code"
                    name="mfa-code"
                    label="Verification code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    error={Boolean(codeError)}
                    helperText={codeError || ' '}
                    disabled={busy}
                  />
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={busy}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {busy ? 'Verifying…' : 'Verify'}
                  </Button>
                  <Button
                    fullWidth
                    type="button"
                    variant="text"
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
              </form>
            )}
          </Box>
        </Box>
      </RightWrapper>
    </Box>
  )
}
