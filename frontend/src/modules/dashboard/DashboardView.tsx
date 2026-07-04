'use client'

/**
 * Dashboard module view.
 *
 * app/(app)/dashboard/page.tsx is a thin route file that just renders this
 * component -- keep all Dashboard implementation here, per the
 * modules/<name> architecture.
 *
 * Every number on this page comes from an existing, already-used API call:
 *  - api.getMeta()      -> ['meta']            (device/bandwidth/subnet counts)
 *  - api.getDevices()   -> ['devices']          (Config Type / Region breakdown, validation calc)
 *  - api.getTags()      -> ['tags']             (tag count -- same query key Settings' Tag
 *                                                 Definitions tab uses, so the cache is shared)
 *  - api.getAudit(8)    -> ['audit', 8]         (Recent Audit Logs)
 *  - api.getHistory(5)  -> ['history', 5]       (Recent Exports -- see note below)
 *
 * Two items from the brief have no backing data and are shown as honest
 * empty/explained sections rather than fabricated:
 *  - "Recent Imports": core/services/import_service.py does not write to
 *    the audit log today (confirmed by grep -- only auth.py and the IP
 *    policy check call audit_repo.log()), so there is no import history
 *    to list.
 *  - "Vendor Distribution" / long-run "Inventory Growth" trend charts
 *    (mentioned in earlier passes) still aren't possible: Device has no
 *    vendor field, and there is no time-series/snapshot endpoint. The two
 *    charts below use fields that do exist (Config Type, Collector Region).
 *
 * "Recent Exports" reuses the existing History list. There's no separate
 * export log in the backend -- each Generate run *is* the export (it
 * produces the downloadable YAML files) -- so History is the closest real
 * data rather than something fabricated for this section.
 */
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import DevicesOtherOutlinedIcon from '@mui/icons-material/DevicesOtherOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { api } from '@/lib/api'
import { StatCard } from '@/components/common/StatCard'
import { MiniBarChart } from '@/components/common/MiniBarChart'

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

export function DashboardView() {
  const { data: meta, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
  })
  const { data: devicesRes, isLoading: devLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.getDevices() })
  const { data: tagsRes } = useQuery({ queryKey: ['tags'], queryFn: () => api.getTags() })
  const { data: auditRes, isLoading: auditLoading } = useQuery({ queryKey: ['audit', 8], queryFn: () => api.getAudit(8) })
  const { data: historyRes, isLoading: historyLoading } = useQuery({ queryKey: ['history', 5], queryFn: () => api.getHistory(5) })

  if (metaError) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetchMeta()}>Retry</Button>}>
        {(metaError as Error).message || 'Failed to load dashboard data.'}
      </Alert>
    )
  }

  const devices = devicesRes?.devices ?? []
  const tagCount = tagsRes?.tagDefs?.length ?? 0

  // ICMP-only devices are identified by Config Type = 'icmp' | 'snmp trap' | 'storage'
  // (matches vanilla JS devices.js resolvedDeviceClass logic). SNMPv3 credentials
  // field is snmpUser (not 'SNMPv3 Username'). Unchanged from the pre-migration version.
  const icmpOnly = devices.filter((d) => ICMP_TYPES.has(((d['Config Type'] as string) ?? '').toLowerCase().trim())).length
  const snmpDevices = devices.length - icmpOnly
  const missingRegion = devices.filter((d) => !d['Collector Region']).length
  const missingCreds = devices.filter((d) => {
    const isIcmp = ICMP_TYPES.has(((d['Config Type'] as string) ?? '').toLowerCase().trim())
    return !isIcmp && !d.snmpUser
  }).length
  const validationIssues = missingRegion + missingCreds
  const loadingStats = metaLoading || devLoading

  // Health status -- derived from the same validation counts already computed
  // above (no new business logic, no new endpoint).
  const healthPct = devices.length === 0 ? 100 : Math.max(0, Math.round(((devices.length - missingRegion - missingCreds) / devices.length) * 100))
  const healthStatus = devices.length === 0 ? 'No data' : healthPct >= 95 ? 'Healthy' : healthPct >= 80 ? 'Needs attention' : 'Critical'
  const healthColor = healthPct >= 95 ? 'success' : healthPct >= 80 ? 'warning' : 'error'

  // Config Type + Region breakdowns -- both computed from the same `devices`
  // array the stat cards above already use.
  const configTypeCounts = new Map<string, number>()
  const regionCounts = new Map<string, number>()
  for (const d of devices) {
    const ct = ((d['Config Type'] as string) || 'Unspecified').trim() || 'Unspecified'
    configTypeCounts.set(ct, (configTypeCounts.get(ct) ?? 0) + 1)
    const region = ((d['Collector Region'] as string) || 'Unassigned').trim() || 'Unassigned'
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
  }
  const configTypeData = Array.from(configTypeCounts.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  const regionData = Array.from(regionCounts.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)

  const auditEntries = auditRes?.entries ?? []
  const recentHistory = historyRes?.entries ?? []

  return (
    <Stack spacing={3}>
      {/* Inventory Summary */}
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Inventory Summary
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} lg={3}>
            {loadingStats ? (
              <Skeleton variant="rounded" height={110} />
            ) : (
              <StatCard label="Device Count" value={meta?.deviceCount ?? devices.length} sub={`${snmpDevices} SNMP · ${icmpOnly} ICMP-only`} icon={DevicesOtherOutlinedIcon} color="primary" />
            )}
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            {loadingStats ? <Skeleton variant="rounded" height={110} /> : <StatCard label="Bandwidth Rows" value={meta?.bandwidthCount ?? 0} icon={SpeedOutlinedIcon} color="info" />}
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            {loadingStats ? <Skeleton variant="rounded" height={110} /> : <StatCard label="Subnet Count" value={meta?.subnetCount ?? 0} icon={HubOutlinedIcon} color="secondary" />}
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            {loadingStats ? <Skeleton variant="rounded" height={110} /> : <StatCard label="Tag Count" value={tagCount} icon={LocalOfferOutlinedIcon} color="secondary" />}
          </Grid>
        </Grid>
      </Box>

      {/* Validation Summary + Health Status */}
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Validation Summary
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} lg={3}>
            {loadingStats ? (
              <Skeleton variant="rounded" height={110} />
            ) : (
              <StatCard
                label="Validation Issues"
                value={validationIssues}
                sub={validationIssues === 0 ? 'All clear' : `${missingRegion} missing region · ${missingCreds} missing creds`}
                icon={FactCheckOutlinedIcon}
                color={validationIssues > 0 ? 'warning' : 'success'}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} lg={9}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Health Status
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={`${healthColor}.main`}>
                    {healthStatus} {devices.length > 0 && `(${healthPct}%)`}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={healthPct} color={healthColor} sx={{ height: 8, borderRadius: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {!loadingStats && (missingRegion > 0 || missingCreds > 0) && (
        <Alert severity="warning" action={<Button component={Link} href="/inventory" color="inherit" size="small">Review devices</Button>}>
          {missingRegion > 0 && <><strong>{missingRegion}</strong> device{missingRegion !== 1 ? 's' : ''} missing Collector Region. </>}
          {missingCreds > 0 && <><strong>{missingCreds}</strong> device{missingCreds !== 1 ? 's' : ''} missing SNMPv3 credentials.</>}
        </Alert>
      )}

      {/* Charts */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Devices by Config Type" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {loadingStats ? <Skeleton variant="rounded" height={140} /> : <MiniBarChart data={configTypeData} color="primary.main" />}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Devices by Region" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {loadingStats ? <Skeleton variant="rounded" height={140} /> : <MiniBarChart data={regionData} color="info.main" />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Audit Logs + side column */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Card variant="outlined">
            <CardHeader
              title="Recent Audit Logs"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              action={
                <Button component={Link} href="/admin/audit-logs" size="small">
                  View all
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {auditLoading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="text" height={32} />)}
                </Stack>
              ) : auditEntries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No activity recorded yet.
                </Typography>
              ) : (
                <Timeline sx={{ p: 0, m: 0 }}>
                  {auditEntries.map((entry, i) => (
                    <TimelineItem key={entry.id ?? i}>
                      <TimelineOppositeContent sx={{ flex: 0.28, minWidth: 110 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {fmtTs(entry.ts)}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="primary" variant="outlined" />
                        {i < auditEntries.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pb: 2 }}>
                        <Typography variant="body2">
                          <strong>{entry.actor ?? 'system'}</strong> {entry.action}
                          {entry.entity && <> · {entry.entity}</>}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            <Card variant="outlined">
              <CardHeader title="Quick Actions" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  <Button component={Link} href="/generate" variant="contained" fullWidth>
                    Generate Config
                  </Button>
                  <Button component={Link} href="/inventory" variant="outlined" fullWidth>
                    Manage Devices
                  </Button>
                  <Button component={Link} href="/validation" variant="outlined" fullWidth>
                    Run Validation
                  </Button>
                  <Button component={Link} href="/history" variant="outlined" fullWidth>
                    View History
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Exports -- reuses History (each Generate run produces the
                downloadable YAML files, so History is the real export record;
                there is no separate export log in the backend). */}
            <Card variant="outlined">
              <CardHeader title="Recent Exports" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
              <CardContent sx={{ pt: 0 }}>
                {historyLoading ? (
                  <Skeleton variant="rounded" height={80} />
                ) : recentHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No YAML generated yet.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableBody>
                      {recentHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary', pl: 0 }}>{fmtTs(h.ts)}</TableCell>
                          <TableCell sx={{ fontSize: 12.5 }}>{h.actor ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Imports -- no backend audit trail exists for import
                events today (see file header note); shown as a labeled,
                honest empty state rather than fabricated rows. */}
            <Card variant="outlined">
              <CardHeader title="Recent Imports" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
              <CardContent sx={{ pt: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  Import events aren&apos;t recorded in the audit log yet -- see core/services/import_service.py.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}
