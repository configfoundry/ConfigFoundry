'use client'

/**
 * Inventory Health -- replaces the previous Device Health + Validation
 * Health cards, which independently computed overlapping classifications
 * off the exact same `devices` array (Device Health: binary
 * configured/needs-attention; Validation Health: tri-state
 * passed/warnings/failed) and rendered as two separate cards. Live testing
 * with real data (948 devices) showed the real cost of that duplication:
 * Device Health's headline was a giant, red-colored "0%" next to a
 * red-colored "948 devices" label -- which reads as "your device count
 * itself is an error," not "your pass rate is low." Two different numbers
 * for what is conceptually one fact (is my inventory ready to generate
 * config from) is confusing, not more informative.
 *
 * This single panel uses ValidationHealth's tri-state classification
 * (Passed / Warnings / Failed -- the more granular of the two, and the one
 * that matches the actual Run Validation workflow) as the one source of
 * truth, and is careful about color semantics: the total device count is
 * ALWAYS neutral (text.primary), never colored red/green, because the
 * count of devices is a fact, not a status. Only the pass-rate chip and the
 * radial chart carry semantic color.
 */
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import CustomChip from '@/@core/components/mui/chip'
import ReactApexcharts from '@/@core/components/react-apexcharts'
import { hexToRGBA } from '@/@core/utils/hex-to-rgba'
import type { Device } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

interface Row {
  title: string
  count: number
  color: ThemeColor
  icon: string
}

export function InventoryHealthPanel({ devices, loading }: { devices: Device[]; loading: boolean }) {
  const theme = useTheme()

  const ipCounts = new Map<string, number>()
  for (const d of devices) {
    if (!d.IP) continue
    ipCounts.set(d.IP, (ipCounts.get(d.IP) ?? 0) + 1)
  }
  const failed = devices.filter((d) => d.IP && (ipCounts.get(d.IP) ?? 0) > 1).length

  const warnings = devices.filter((d) => {
    if (d.IP && (ipCounts.get(d.IP) ?? 0) > 1) return false
    const isIcmp = ICMP_TYPES.has(((d['Config Type'] as string) ?? '').toLowerCase().trim())
    const missingRegion = !d['Collector Region']
    const missingCreds = !isIcmp && !d.snmpUser
    return missingRegion || missingCreds
  }).length

  const total = devices.length
  const passed = total - failed - warnings
  const passPct = total === 0 ? 100 : Math.round((passed / total) * 100)
  const statusColor: ThemeColor = total === 0 ? 'secondary' : passPct >= 90 ? 'success' : passPct >= 50 ? 'warning' : 'error'

  const rows: Row[] = [
    { title: 'Passed', count: passed, color: 'success', icon: 'tabler:check' },
    { title: 'Warnings', count: warnings, color: 'warning', icon: 'tabler:alert-triangle' },
    { title: 'Failed', count: failed, color: 'error', icon: 'tabler:x' },
  ]

  const options: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    stroke: { dashArray: 6 },
    labels: ['Passing'],
    colors: [hexToRGBA(theme.palette[statusColor === 'secondary' ? 'primary' : statusColor].main, 1)],
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        opacityTo: 0.5,
        opacityFrom: 1,
        shadeIntensity: 0.5,
        stops: [30, 70, 100],
        inverseColors: false,
        gradientToColors: [theme.palette[statusColor === 'secondary' ? 'primary' : statusColor].main],
      },
    },
    plotOptions: {
      radialBar: {
        endAngle: 130,
        startAngle: -140,
        hollow: { size: '65%' },
        track: { background: 'transparent' },
        dataLabels: {
          name: { offsetY: -10, color: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.body2.fontSize as string },
          value: {
            offsetY: 10,
            fontWeight: 500,
            formatter: (value) => `${value}%`,
            color: theme.palette.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.h3.fontSize as string,
          },
        },
      },
    },
    grid: { padding: { top: -20, bottom: 6 } },
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="Inventory Health"
        subheader="Validation status of your current device inventory"
        action={
          <Button size="small" component={Link} href="/validation/findings" endIcon={<Icon icon="tabler:arrow-right" />}>
            View Findings
          </Button>
        }
      />
      <CardContent>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} sm={5}>
            {loading ? (
              <Skeleton variant="text" width={80} height={56} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                <Typography variant="h3">{total}</Typography>
                <Typography sx={{ color: 'text.secondary' }}>total devices</Typography>
              </Box>
            )}
            {!loading && total > 0 && (
              <CustomChip
                size="small"
                skin="light"
                rounded
                color={statusColor}
                label={`${passPct}% passing validation`}
                sx={{ mb: 5 }}
              />
            )}
            {rows.map((row, i) => (
              <Box key={row.title} sx={{ display: 'flex', alignItems: 'center', mb: i !== rows.length - 1 ? 3 : 0 }}>
                <CustomAvatar skin="light" variant="rounded" color={row.color} sx={{ mr: 3, width: 30, height: 30 }}>
                  <Icon icon={row.icon} fontSize="1.125rem" />
                </CustomAvatar>
                <Typography sx={{ flexGrow: 1, color: 'text.secondary' }}>{row.title}</Typography>
                {loading ? <Skeleton variant="text" width={30} /> : <Typography sx={{ fontWeight: 600 }}>{row.count}</Typography>}
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} sm={7} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <Skeleton variant="circular" width={200} height={200} />
            ) : (
              <ReactApexcharts type="radialBar" height={280} options={options} series={[passPct]} />
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
