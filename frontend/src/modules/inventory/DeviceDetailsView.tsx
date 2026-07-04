'use client'

/**
 * Device Details -- NEW page (Strategy A, approved: client-side only, no
 * new backend endpoints). Modeled on Vuexy's real "User View"
 * (pages/apps/user/view/[tab].tsx + views/apps/user/view/{UserViewLeft,
 * UserViewAccount,UserViewSecurity}.tsx): 2-column Grid (profile card +
 * tabbed panel), Vuexy Timeline, CustomChip/CustomAvatar,
 * TabContext/TabList/TabPanel. Vuexy's actual UserViewSecurity.tsx content
 * (password-change form, fake SMS 2FA, fake "recent devices" login table)
 * is 100% demo data with no ConfigFoundry equivalent and was not ported --
 * only its CustomTextField/eye-toggle *pattern* informed the masked-secret
 * UI below.
 *
 * Reused verbatim: DeviceFormDrawer, ConfirmDialog, EmptyState, useToast,
 * the existing ['devices'] query, upsertDevice/deleteDevice mutations, and
 * the deviceStatus/deviceTypeMeta/configTypeMeta helpers already used by
 * DevicesView.tsx (extracted to ./deviceMeta.ts so both views share one
 * implementation instead of duplicating it).
 *
 * ---------------------------------------------------------------------
 * TECHNICAL DEBT (documentation only -- intentionally NOT fixed here):
 *
 * 1. No GET /devices/{id}. This page finds the device client-side from the
 *    existing cached ['devices'] list query (api.getDevices()) rather than
 *    fetching it individually -- fine at current data volumes, but would
 *    need a real single-device endpoint if the device list grows large
 *    enough that fetching everything just to view one device is wasteful.
 *
 * 2. Audit records don't populate resource_type/resource_id --
 *    core/services/device_service.py's audit_repo.log() calls are always
 *    positional (actor, action, details-dict) and never pass those two
 *    columns, even though core/repositories/sqlalchemy/audit.py's log()
 *    signature already supports them. The Audit History tab below can
 *    therefore only do a BEST-EFFORT match against the free-form `details`
 *    blob (details.id / details.ip) -- this is presented to the user as
 *    best-effort, not an authoritative/guaranteed-complete history.
 *
 * 3. authKey/privKey are decrypted and returned in plaintext by GET
 *    /devices today (core/repositories/{sqlite,sqlalchemy}/device.py
 *    decrypt on read). This page never displays them automatically --
 *    masked "••••••••" with an explicit per-field Reveal toggle only.
 *    Future backend work should return these masked from the list endpoint
 *    entirely and/or add a dedicated, authorized credential-reveal
 *    endpoint so the plaintext values stop reaching the browser at all.
 *
 * 4. Dynamic tag values are stored as device.tags[tagDefId] -- an untyped
 *    JSON blob field (see the comment on Device.tags in lib/types.ts). This
 *    page only reads it; there's still no UI anywhere, including here, to
 *    WRITE a tag value onto a device -- matches TagService's current scope.
 * ---------------------------------------------------------------------
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import MuiTimeline, { type TimelineProps } from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { styled } from '@mui/material/styles'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import CustomChip from '@/@core/components/mui/chip'
import { api } from '@/lib/api'
import type { Device } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeviceFormDrawer } from './DeviceFormDrawer'
import { STATUS_META, deviceStatus, deviceTypeMeta, configTypeMeta, isSnmpConfigType } from './deviceMeta'

const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': { width: '100%', '&:before': { display: 'none' } },
})

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function dotColor(action: string): ThemeColor {
  const a = action.toLowerCase()
  if (a.startsWith('delete')) return 'error'
  if (a.startsWith('create') || a.startsWith('add')) return 'success'
  if (a.startsWith('update') || a.startsWith('edit')) return 'info'
  return 'secondary'
}

export function DeviceDetailsView({ deviceId }: { deviceId: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: devicesRes, isLoading, error, refetch } = useQuery({ queryKey: ['devices'], queryFn: () => api.getDevices() })
  const devices = useMemo(() => devicesRes?.devices ?? [], [devicesRes])
  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId])

  const { data: tagsRes, isLoading: tagsLoading } = useQuery({ queryKey: ['tags'], queryFn: () => api.getTags() })
  const { data: auditRes, isLoading: auditLoading } = useQuery({ queryKey: ['audit', 200], queryFn: () => api.getAudit(200) })

  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAuthKey, setShowAuthKey] = useState(false)
  const [showPrivKey, setShowPrivKey] = useState(false)

  const saveMut = useMutation({
    mutationFn: (d: Partial<Device>) => api.upsertDevice(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setEditOpen(false)
      toast('Device saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      toast('Device deleted', 'success')
      router.push('/inventory/devices')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  if (isLoading) return <Skeleton variant="rounded" height={480} />
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        {(error as Error).message}
      </Alert>
    )
  }

  if (!device) {
    return (
      <EmptyState
        title="Device not found"
        sub="It may have been deleted, or this link is out of date."
        action={
          <Button component={Link} href="/inventory/devices" variant="contained" startIcon={<Icon icon="tabler:chevron-left" />}>
            Back to Inventory
          </Button>
        }
      />
    )
  }

  const status = STATUS_META[deviceStatus(device)]
  const typeMeta = deviceTypeMeta(device)
  const cfgMeta = configTypeMeta(device)
  const isSnmp = isSnmpConfigType(device)

  // Audit History -- best-effort client-side match only (see TODO 2 above).
  // The backend never stores a queryable device id/ip column for audit
  // rows, so this inspects the free-form `details` blob DeviceService
  // actually writes ({ id, ip }) rather than inventing any association.
  const auditEntries = auditRes?.entries ?? []
  const relatedAudit = auditEntries.filter((e) => {
    const details = e.details
    if (!details || typeof details !== 'object') return false
    const d = details as Record<string, unknown>
    return d.id === device.id || (!!device.IP && d.ip === device.IP)
  })

  // Dynamic Tags -- only TagDefs scoped to "devices" that actually have a
  // value set on this device (device.tags[tagDef.id]); see TODO 4 above.
  const tagDefs = (tagsRes?.tagDefs ?? []).filter((t) => !t.scopes || t.scopes.includes('devices'))
  const deviceTags = device.tags ?? {}
  const assignedTags = tagDefs.filter((t) => !!deviceTags[t.id])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={5} lg={4}>
        <Card>
          <CardContent sx={{ pt: 13.5, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <CustomAvatar skin="light" variant="rounded" color={typeMeta.color} sx={{ width: 100, height: 100, mb: 4 }}>
              <Icon icon={typeMeta.icon} fontSize="3rem" />
            </CustomAvatar>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', wordBreak: 'break-word' }}>
              {device.Device || device.IP}
            </Typography>
            <CustomChip rounded skin="light" size="small" label={status.label} color={status.color} />
          </CardContent>

          <Divider sx={{ my: '0 !important', mx: 6 }} />

          <CardContent sx={{ pb: 4 }}>
            <Typography variant="body2" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>
              Details
            </Typography>
            <Box sx={{ pt: 4 }}>
              <Box sx={{ display: 'flex', mb: 3 }}>
                <Typography sx={{ mr: 2, fontWeight: 500, color: 'text.secondary' }}>IP Address:</Typography>
                <Typography sx={{ color: 'text.secondary' }}>{device.IP || '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', mb: 3 }}>
                <Typography sx={{ mr: 2, fontWeight: 500, color: 'text.secondary' }}>Region:</Typography>
                <Typography sx={{ color: 'text.secondary' }}>{device['Collector Region'] || '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', mb: 3, alignItems: 'center' }}>
                <Typography sx={{ mr: 2, fontWeight: 500, color: 'text.secondary' }}>Config Type:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Icon icon={cfgMeta.icon} fontSize="1rem" style={{ marginRight: 6 }} />
                  <Typography sx={{ color: 'text.secondary' }}>{(device['Config Type'] as string) || 'Not configured'}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ mr: 2, fontWeight: 500, color: 'text.secondary' }}>Protocol:</Typography>
                <CustomChip rounded skin="light" size="small" label={isSnmp ? 'SNMPv3' : 'ICMP'} color={isSnmp ? 'primary' : 'info'} />
              </Box>
            </Box>
          </CardContent>

          <CardActions sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" sx={{ mr: 2 }} startIcon={<Icon icon="tabler:edit" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button color="error" variant="tonal" startIcon={<Icon icon="tabler:trash" />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </CardActions>
        </Card>

        <Button component={Link} href="/inventory/devices" startIcon={<Icon icon="tabler:chevron-left" />} sx={{ mt: 4 }}>
          Back to Inventory
        </Button>
      </Grid>

      <Grid item xs={12} md={7} lg={8}>
        <TabContext value={tab}>
          <TabList
            variant="scrollable"
            onChange={(_e, v: string) => setTab(v)}
            sx={{ mb: 4, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Tab value="overview" label="Overview" icon={<Icon icon="tabler:smart-home" />} iconPosition="start" />
            <Tab value="audit" label="Audit History" icon={<Icon icon="tabler:history" />} iconPosition="start" />
            <Tab value="tags" label="Dynamic Tags" icon={<Icon icon="tabler:tags" />} iconPosition="start" />
            <Tab value="snmp" label="SNMP Configuration" icon={<Icon icon="tabler:shield-lock" />} iconPosition="start" />
          </TabList>

          <TabPanel value="overview" sx={{ p: 0 }}>
            <Card>
              <CardHeader title="Device Information" />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      Hostname
                    </Typography>
                    <Typography>{device.Device || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      IP Address
                    </Typography>
                    <Typography>{device.IP || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      Collector Region
                    </Typography>
                    <Typography>{device['Collector Region'] || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      Config Type
                    </Typography>
                    <Typography>{(device['Config Type'] as string) || 'Not configured'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      Remarks
                    </Typography>
                    <Typography>{device.Remarks || '—'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value="audit" sx={{ p: 0 }}>
            <Card>
              <CardHeader title="Audit History" subheader="Best-effort match against recent audit records" />
              <CardContent>
                {auditLoading ? (
                  <Skeleton variant="rounded" height={200} />
                ) : relatedAudit.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Per-device audit history is not yet available because audit records are not linked to individual devices.
                  </Typography>
                ) : (
                  <Timeline>
                    {relatedAudit.map((entry, i) => (
                      <TimelineItem key={entry.id ?? i}>
                        <TimelineSeparator>
                          <TimelineDot color={dotColor(entry.action)} />
                          {i < relatedAudit.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ pb: 4 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ mr: 2 }}>
                              {entry.action}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {fmtTs(entry.ts)}
                            </Typography>
                          </Box>
                          <Typography variant="body2">{entry.actor ?? 'system'}</Typography>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value="tags" sx={{ p: 0 }}>
            <Card>
              <CardHeader title="Dynamic Tags" subheader="Tags defined in Settings → Tags with a value set on this device" />
              <CardContent>
                {tagsLoading ? (
                  <Skeleton variant="rounded" height={120} />
                ) : assignedTags.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No dynamic tags are set on this device.
                  </Typography>
                ) : (
                  <Grid container spacing={4}>
                    {assignedTags.map((t) => (
                      <Grid item xs={12} sm={6} key={t.id}>
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          {t.label || t.name}
                        </Typography>
                        <Typography>{deviceTags[t.id]}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value="snmp" sx={{ p: 0 }}>
            <Card>
              <CardHeader title="SNMP Configuration" />
              <CardContent>
                {!isSnmp ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    This device is configured as ICMP-only; no SNMP credentials apply.
                  </Typography>
                ) : (
                  <Grid container spacing={4}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        SNMPv3 Username
                      </Typography>
                      <Typography>{device.snmpUser || 'Not configured'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Auth Protocol
                      </Typography>
                      <Typography>{device.authProtocol || 'Not configured'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Auth Password
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontFamily: showAuthKey ? undefined : 'monospace' }}>
                          {device.authKey ? (showAuthKey ? device.authKey : '••••••••') : 'Not configured'}
                        </Typography>
                        {!!device.authKey && (
                          <IconButton size="small" onClick={() => setShowAuthKey((v) => !v)} sx={{ ml: 1 }}>
                            <Icon icon={showAuthKey ? 'tabler:eye-off' : 'tabler:eye'} fontSize="1.1rem" />
                          </IconButton>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Priv Protocol
                      </Typography>
                      <Typography>{device.privProtocol || 'Not configured'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Priv Password
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontFamily: showPrivKey ? undefined : 'monospace' }}>
                          {device.privKey ? (showPrivKey ? device.privKey : '••••••••') : 'Not configured'}
                        </Typography>
                        {!!device.privKey && (
                          <IconButton size="small" onClick={() => setShowPrivKey((v) => !v)} sx={{ ml: 1 }}>
                            <Icon icon={showPrivKey ? 'tabler:eye-off' : 'tabler:eye'} fontSize="1.1rem" />
                          </IconButton>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </TabContext>
      </Grid>

      {editOpen && (
        <DeviceFormDrawer
          open
          device={device}
          onClose={() => setEditOpen(false)}
          onSave={(d) => saveMut.mutate(d)}
          saving={saveMut.isPending}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete device"
          message={`Delete ${device.Device || device.IP}? This cannot be undone.`}
          onConfirm={() => deleteMut.mutate(device.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Grid>
  )
}
