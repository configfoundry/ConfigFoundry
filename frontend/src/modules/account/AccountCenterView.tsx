'use client'

/**
 * Personal Settings -- Account Center. A configuration workspace, not a
 * dashboard: the first screen stays deliberately simple (see git history
 * for the earlier, denser revision with a KPI-style quick-actions grid,
 * a full security/preferences breakdown, a filtered activity timeline, and
 * a Danger Zone -- all removed here to match the current, tighter spec).
 *
 * Sections:
 *   1. Profile Card      -- avatar, name, email, role, organization, last
 *      login, MFA status. Real data only: useAuth().user for identity/MFA,
 *      api.users.list() (when user:read is granted) for last_login_at --
 *      there is no organization display-name field anywhere in the API
 *      (see lib/types.ts MeResponse), so "Organization" is honestly the
 *      org ID, not a fabricated name.
 *   2. Quick Actions     -- a plain link row (profile / password / sessions
 *      / notifications), not dashboard tiles.
 *   3. Security          -- compact rows: Password, MFA, Recovery Methods
 *      (links to the real /account/profile and /account/mfa pages -- no
 *      fabricated backup-codes count, since that's only ever shown once,
 *      at enrollment time, per modules/account/MfaCard.tsx).
 *   4. Preferences       -- compact rows: Appearance (real, via
 *      useSettings()), Language and Timezone (there is no such field
 *      anywhere in the Settings type or API -- shown honestly as "Not
 *      configurable" rather than invented).
 *   5. Connected Sessions -- ONE line: a real count from
 *      api.auth.listSessions() plus a link to the full /account/sessions
 *      table. The complete session list already exists there; it is not
 *      duplicated on this landing page.
 */
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Icon from '@/@core/components/icon'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { useSettings } from '@/@core/hooks/useSettings'
import { getInitials } from '@/@core/utils/get-initials'

function fmtEpochSeconds(ts: number) {
  try {
    return new Date(ts * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(ts)
  }
}

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------
function ProfileCard() {
  const { user, hasPermission } = useAuth()
  const canUsers = hasPermission('user:read')
  const usersQ = useQuery({ queryKey: ['org-users'], queryFn: () => api.users.list(), enabled: canUsers })

  const displayName = user?.full_name || user?.name || user?.email || 'User'
  const self = canUsers ? usersQ.data?.users.find((u) => u.id === user?.id) : undefined

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'center' }}>
          <Avatar sx={{ width: 72, height: 72, fontSize: '1.75rem', flexShrink: 0 }}>{getInitials(displayName)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6">{displayName}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {(user?.roles ?? []).map((r) => (
              <Chip key={r.id} label={r.name} size="small" variant="outlined" />
            ))}
            <Chip
              label={user?.mfa_enabled ? 'MFA Enabled' : 'MFA Disabled'}
              size="small"
              color={user?.mfa_enabled ? 'success' : 'default'}
            />
          </Stack>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={5} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="overline" color="text.secondary">Organization</Typography>
            <Typography variant="body2" fontFamily="monospace" noWrap>{user?.org_id ?? '—'}</Typography>
          </Box>
          {self?.last_login_at != null && (
            <Box>
              <Typography variant="overline" color="text.secondary">Last Login</Typography>
              <Typography variant="body2">{fmtEpochSeconds(self.last_login_at)}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Quick Actions -- a plain link row, not dashboard tiles
// ---------------------------------------------------------------------------
interface QuickAction {
  key: string
  label: string
  href: string
  icon: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'profile', label: 'Edit Profile', href: '/account/profile', icon: 'tabler:user' },
  { key: 'password', label: 'Change Password', href: '/account/profile', icon: 'tabler:lock' },
  { key: 'sessions', label: 'Manage Sessions', href: '/account/sessions', icon: 'tabler:devices' },
  { key: 'notifications', label: 'Notification Preferences', href: '/account/notifications', icon: 'tabler:bell' },
]

function QuickActionsRow() {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.key}
          component={Link}
          href={action.href}
          variant="outlined"
          size="small"
          startIcon={<Icon icon={action.icon} fontSize="1rem" />}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Security -- compact rows, not a summary card of stats
// ---------------------------------------------------------------------------
function SecurityCard() {
  const { user } = useAuth()

  const rows = [
    {
      label: 'Password',
      node: <Chip size="small" color={user?.must_change_password ? 'warning' : 'success'} label={user?.must_change_password ? 'Change required' : 'Up to date'} />,
      href: '/account/profile',
    },
    {
      label: 'Multi-Factor Authentication',
      node: <Chip size="small" color={user?.mfa_enabled ? 'success' : 'default'} label={user?.mfa_enabled ? 'Enabled' : 'Disabled'} />,
      href: '/account/mfa',
    },
    {
      label: 'Recovery Methods',
      node: <Chip size="small" variant="outlined" label={user?.mfa_enabled ? 'Backup codes' : 'None configured'} />,
      href: '/account/mfa',
    },
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>Security</Typography>
        <Stack spacing={3}>
          {rows.map((row) => (
            <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{row.label}</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                {row.node}
                <Link href={row.href} style={{ display: 'flex' }}>
                  <Icon icon="tabler:chevron-right" fontSize="1rem" />
                </Link>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Preferences -- compact rows; Language/Timezone are honestly "Not
// configurable" since no such field exists anywhere in this app.
// ---------------------------------------------------------------------------
const MODE_LABELS: Record<string, string> = { light: 'Light', dark: 'Dark', 'semi-dark': 'Semi Dark' }

function PreferencesCard() {
  const { settings } = useSettings()

  const rows = [
    {
      label: 'Appearance',
      node: <Chip size="small" variant="outlined" label={MODE_LABELS[settings.mode] ?? settings.mode} />,
      href: '/account/theme',
    },
    { label: 'Language', node: <Chip size="small" variant="outlined" label="Not configurable" />, href: null },
    { label: 'Timezone', node: <Chip size="small" variant="outlined" label="Not configurable" />, href: null },
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>Preferences</Typography>
        <Stack spacing={3}>
          {rows.map((row) => (
            <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{row.label}</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                {row.node}
                {row.href && (
                  <Link href={row.href} style={{ display: 'flex' }}>
                    <Icon icon="tabler:chevron-right" fontSize="1rem" />
                  </Link>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Connected Sessions -- ONE line summary, not the sessions table
// ---------------------------------------------------------------------------
function ConnectedSessionsSummary() {
  const sessionsQ = useQuery({ queryKey: ['auth-sessions'], queryFn: () => api.auth.listSessions() })
  const count = sessionsQ.data?.sessions.length ?? 0

  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
        <Typography variant="body2">
          {sessionsQ.isLoading ? 'Loading sessions…' : `${count} Active Session${count !== 1 ? 's' : ''}`}
        </Typography>
        <Button component={Link} href="/account/sessions" size="small" endIcon={<Icon icon="tabler:arrow-right" fontSize="1rem" />}>
          View All
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function AccountCenterView() {
  return (
    <Stack spacing={6}>
      <ProfileCard />
      <QuickActionsRow />
      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <SecurityCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <PreferencesCard />
        </Grid>
      </Grid>
      <ConnectedSessionsSummary />
    </Stack>
  )
}
