'use client'

/**
 * Organization Settings -- configuration workspace entry page, NOT a
 * dashboard. Earlier revisions of this page leaned on KPI tiles and
 * per-item status rows (see git history); that reads as analytics, not
 * configuration. This version answers three questions only: where am I,
 * what can I configure, what should I do next -- everything else
 * (counts, adoption percentages, per-item connectivity detail) belongs on
 * the dedicated management pages this page links to, not here.
 *
 * Sections (top to bottom):
 *   1. Quick Actions       -- a plain action row, not KPI-style tiles
 *   2. Configuration Areas -- 3 clean navigation cards (Identity & Access /
 *      Platform / Governance), each just an icon + one-line description +
 *      a compact row of link chips. No per-item status text, no long list.
 *   3. Organization Health -- a single compact strip of status chips, not
 *      a multi-row widget.
 *   4. Recent Administrative Activity -- reuses Dashboard's real
 *      RecentActivity component (same api.getAudit() feed used app-wide,
 *      see modules/dashboard/RecentActivity.tsx), trimmed to a handful of
 *      entries -- a pointer to what changed, not a full timeline.
 *
 * Nothing here is fabricated: where the backend has no real status source
 * (Database/SMTP/License/Storage), that's shown honestly as "Not
 * connected", matching SystemSettingsScaffold.tsx's existing convention.
 * Permission gates are unchanged from prior revisions (user:read /
 * role:read / api:manage / policy:manage / audit:read).
 */
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import type { ThemeColor } from '@/@core/layouts/types'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { RecentActivity } from '@/modules/dashboard/RecentActivity'

// ---------------------------------------------------------------------------
// Quick Actions -- a plain button row, not dashboard tiles
// ---------------------------------------------------------------------------
interface QuickAction {
  key: string
  label: string
  href: string
  icon: string
  permission: string | null
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'invite', label: 'Invite User', href: '/administration/users', icon: 'tabler:user-plus', permission: 'user:read' },
  { key: 'apikey', label: 'Create API Key', href: '/administration/api-keys', icon: 'tabler:key', permission: 'api:manage' },
  { key: 'auth', label: 'Configure Authentication', href: '/system/authentication', icon: 'tabler:lock-access', permission: null },
  { key: 'audit', label: 'Open Audit Logs', href: '/administration/audit-logs', icon: 'tabler:receipt-2', permission: 'audit:read' },
]

function QuickActionsRow({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const actions = QUICK_ACTIONS.filter((a) => a.permission === null || hasPermission(a.permission))
  if (actions.length === 0) return null

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {actions.map((action) => (
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
// Configuration Areas -- 3 clean navigation cards, not long lists
// ---------------------------------------------------------------------------
interface AreaLink {
  href: string
  label: string
  permission: string | null
}

interface Area {
  title: string
  description: string
  icon: string
  color: ThemeColor
  links: AreaLink[]
}

const AREAS: Area[] = [
  {
    title: 'Identity & Access',
    description: 'Users, roles, and API keys for this organization.',
    icon: 'tabler:users',
    color: 'primary',
    links: [
      { href: '/administration/users', label: 'Users', permission: 'user:read' },
      { href: '/administration/roles', label: 'Roles', permission: 'role:read' },
      { href: '/administration/api-keys', label: 'API Keys', permission: 'api:manage' },
    ],
  },
  {
    title: 'Platform',
    description: 'Global configuration, authentication, and infrastructure connections.',
    icon: 'tabler:settings-2',
    color: 'info',
    links: [
      { href: '/system/global-settings', label: 'Global Settings', permission: null },
      { href: '/system/authentication', label: 'Authentication', permission: null },
      { href: '/system/database', label: 'Database', permission: null },
      { href: '/system/smtp', label: 'SMTP', permission: null },
      { href: '/system/storage', label: 'Storage', permission: null },
      { href: '/system/integrations', label: 'Integrations', permission: null },
      { href: '/system/licensing', label: 'Licensing', permission: null },
      { href: '/system/backup', label: 'Backup & Restore', permission: null },
      { href: '/system/security-policies', label: 'Security Policies', permission: 'policy:manage' },
    ],
  },
  {
    title: 'Governance',
    description: 'Audit history and compliance visibility.',
    icon: 'tabler:receipt-2',
    color: 'secondary',
    links: [{ href: '/administration/audit-logs', label: 'Audit Logs', permission: 'audit:read' }],
  },
]

function ConfigurationAreas({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  return (
    <Grid container spacing={4}>
      {AREAS.map((area) => {
        const links = area.links.filter((l) => l.permission === null || hasPermission(l.permission))
        if (links.length === 0) return null

        return (
          <Grid item xs={12} md={4} key={area.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }}>
                  <CustomAvatar skin="light" variant="rounded" color={area.color} sx={{ width: 36, height: 36, flexShrink: 0 }}>
                    <Icon icon={area.icon} fontSize="1.25rem" />
                  </CustomAvatar>
                  <Typography variant="subtitle1" fontWeight={600}>{area.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {area.description}
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {links.map((link) => (
                    <Chip
                      key={link.href}
                      component={Link}
                      href={link.href}
                      clickable
                      size="small"
                      variant="outlined"
                      label={link.label}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

// ---------------------------------------------------------------------------
// Organization Health -- one compact status strip, not a widget
// ---------------------------------------------------------------------------
function OrganizationHealth({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const canUsers = hasPermission('user:read')
  const usersQ = useQuery({ queryKey: ['org-users'], queryFn: () => api.users.list(), enabled: canUsers })
  const users = usersQ.data?.users ?? []
  const mfaCount = users.filter((u) => u.mfa_enabled).length
  const mfaPct = users.length > 0 ? Math.round((100 * mfaCount) / users.length) : null

  const rows: { label: string; href: string; status: string; color: 'success' | 'warning' | 'error' | 'default' } [] = [
    {
      label: 'Authentication',
      href: '/system/authentication',
      status: canUsers && mfaPct !== null ? `${mfaPct}% MFA` : '—',
      color: canUsers && mfaPct !== null ? (mfaPct >= 80 ? 'success' : mfaPct >= 40 ? 'warning' : 'error') : 'default',
    },
    { label: 'Database', href: '/system/database', status: 'Not connected', color: 'warning' },
    { label: 'SMTP', href: '/system/smtp', status: 'Not connected', color: 'warning' },
    { label: 'License', href: '/system/licensing', status: 'Not connected', color: 'warning' },
    { label: 'Storage', href: '/system/storage', status: 'Not connected', color: 'warning' },
  ]

  return (
    <Card>
      <CardContent sx={{ py: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="overline" color="text.secondary" sx={{ mr: 1 }}>
            Organization Health
          </Typography>
          {rows.map((row) => (
            <Chip
              key={row.label}
              component={Link}
              href={row.href}
              clickable
              size="small"
              variant="outlined"
              color={row.color === 'default' ? undefined : row.color}
              label={`${row.label}: ${row.status}`}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function OrganizationSettingsView() {
  const { hasPermission } = useAuth()
  const canAudit = hasPermission('audit:read')

  const auditQ = useQuery({ queryKey: ['audit', 6], queryFn: () => api.getAudit(6), enabled: canAudit })
  const auditEntries = auditQ.data?.entries ?? []

  return (
    <Stack spacing={6}>
      <QuickActionsRow hasPermission={hasPermission} />
      <ConfigurationAreas hasPermission={hasPermission} />
      <OrganizationHealth hasPermission={hasPermission} />
      {canAudit && (
        <Box>
          <RecentActivity entries={auditEntries} loading={auditQ.isLoading} />
        </Box>
      )}
    </Stack>
  )
}
