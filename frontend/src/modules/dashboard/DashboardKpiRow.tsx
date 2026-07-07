'use client'

/**
 * Compact KPI rail -- the direct answer to "how many devices/bandwidth
 * rows/subnets do I have, is validation passing, how many configs have been
 * generated" that the redesign brief asked the Dashboard to answer at a
 * glance. Replaces the old uneven 3-card top row (Inventory Overview +
 * Device Health + Configurations Generated), which mixed a tall detailed
 * card with a short stat card in the same row and left large dead
 * whitespace beneath the shorter one (confirmed live once real inventory
 * existed -- see DashboardView.tsx history).
 *
 * Five equal-width tiles, each one number + one label + one link, no
 * secondary stats competing for attention here -- the detailed breakdowns
 * (config-type chart, configured vs needs-attention, passed/warnings/failed)
 * live one level down in InventoryHealthPanel/InventorySummary so this row
 * stays scannable in under a second, the way a Datadog/Grafana top-of-page
 * stat rail does.
 */
import Link from 'next/link'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import type { ThemeColor } from '@/@core/layouts/types'

interface Kpi {
  key: string
  label: string
  value: number
  icon: string
  color: ThemeColor
  href: string
  suffix?: string
}

export function DashboardKpiRow({
  deviceCount,
  bandwidthCount,
  subnetCount,
  configsGenerated,
  validationPassPct,
  loading,
}: {
  deviceCount: number
  bandwidthCount: number
  subnetCount: number
  configsGenerated: number
  validationPassPct: number | null
  loading: boolean
}) {
  const kpis: Kpi[] = [
    { key: 'devices', label: 'Devices', value: deviceCount, icon: 'tabler:box', color: 'primary', href: '/infrastructure/devices' },
    { key: 'bandwidth', label: 'Bandwidth Rows', value: bandwidthCount, icon: 'tabler:gauge', color: 'info', href: '/infrastructure/bandwidth-profiles' },
    { key: 'subnets', label: 'Subnets', value: subnetCount, icon: 'tabler:topology-star-3', color: 'secondary', href: '/infrastructure/subnets' },
    { key: 'configs', label: 'Configs Generated', value: configsGenerated, icon: 'tabler:file-code', color: 'success', href: '/configuration/generated' },
    {
      key: 'validation',
      label: 'Validation Passing',
      value: validationPassPct ?? 0,
      suffix: '%',
      icon: 'tabler:shield-check',
      color: validationPassPct === null ? 'secondary' : validationPassPct >= 90 ? 'success' : validationPassPct >= 50 ? 'warning' : 'error',
      href: '/validation/findings',
    },
  ]

  return (
    <Grid container spacing={4}>
      {kpis.map((kpi) => (
        <Grid item xs={6} sm={4} lg key={kpi.key}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea component={Link} href={kpi.href} sx={{ height: '100%' }}>
              <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <CustomAvatar skin="light" variant="rounded" color={kpi.color} sx={{ width: 40, height: 40, flexShrink: 0 }}>
                  <Icon icon={kpi.icon} fontSize="1.375rem" />
                </CustomAvatar>
                <Box sx={{ minWidth: 0 }}>
                  {loading ? (
                    <Skeleton variant="text" width={50} height={32} />
                  ) : (
                    <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                      {kpi.value}
                      {kpi.suffix ?? ''}
                    </Typography>
                  )}
                  <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                    {kpi.label}
                  </Typography>
                </Box>
              </Box>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
