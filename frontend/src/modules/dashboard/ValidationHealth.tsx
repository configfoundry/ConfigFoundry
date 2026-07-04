'use client'

/**
 * Validation Health -- ported from Vuexy's AnalyticsSupportTracker.tsx
 * (radial bar + 3 stat rows), replacing "Support Tracker" / fake ticket
 * counts.
 *
 * Demo content removed: 164 Total Tickets, New/Open Tickets, Response Time.
 *
 * Data: api.getDevices() (['devices'], already used by Inventory/Device
 * Health) -- there is no standalone validation-status query endpoint (only
 * api.generate(), a mutation triggered from the Generate page), so Passed/
 * Warnings/Failed are computed client-side from real current inventory state,
 * consistent with the same rules the Generate/Validation views already use:
 *   Failed   = devices sharing a duplicate IP with another device
 *   Warnings = devices missing a Collector Region or (for SNMP) credentials,
 *              excluding ones already counted as Failed
 *   Passed   = everything else
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import OptionsMenu from '@/@core/components/option-menu'
import ReactApexcharts from '@/@core/components/react-apexcharts'
import { hexToRGBA } from '@/@core/utils/hex-to-rgba'
import type { Device } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

interface Row {
  title: string
  subtitle: string
  avatarIcon: string
  avatarColor?: ThemeColor
}

export function ValidationHealth({ devices, loading }: { devices: Device[]; loading: boolean }) {
  const theme = useTheme()

  const ipCounts = new Map<string, number>()
  for (const d of devices) {
    if (!d.IP) continue
    ipCounts.set(d.IP, (ipCounts.get(d.IP) ?? 0) + 1)
  }
  const failed = devices.filter((d) => d.IP && (ipCounts.get(d.IP) ?? 0) > 1).length

  const warnings = devices.filter((d) => {
    if (d.IP && (ipCounts.get(d.IP) ?? 0) > 1) return false // already counted as Failed
    const isIcmp = ICMP_TYPES.has(((d['Config Type'] as string) ?? '').toLowerCase().trim())
    const missingRegion = !d['Collector Region']
    const missingCreds = !isIcmp && !d.snmpUser
    return missingRegion || missingCreds
  }).length

  const total = devices.length
  const passed = total - failed - warnings
  const passPct = total === 0 ? 100 : Math.round((passed / total) * 100)

  const rows: Row[] = [
    { title: 'Passed', subtitle: String(passed), avatarIcon: 'tabler:check' },
    { title: 'Warnings', subtitle: String(warnings), avatarColor: 'warning', avatarIcon: 'tabler:alert-triangle' },
    { title: 'Failed', subtitle: String(failed), avatarColor: 'error', avatarIcon: 'tabler:x' },
  ]

  const options: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    stroke: { dashArray: 10 },
    labels: ['Passing'],
    colors: [hexToRGBA(theme.palette.primary.main, 1)],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        opacityTo: 0.5,
        opacityFrom: 1,
        shadeIntensity: 0.5,
        stops: [30, 70, 100],
        inverseColors: false,
        gradientToColors: [theme.palette.primary.main],
      },
    },
    plotOptions: {
      radialBar: {
        endAngle: 130,
        startAngle: -140,
        hollow: { size: '60%' },
        track: { background: 'transparent' },
        dataLabels: {
          name: {
            offsetY: -15,
            color: theme.palette.text.disabled,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.body2.fontSize as string,
          },
          value: {
            offsetY: 15,
            fontWeight: 500,
            formatter: (value) => `${value}%`,
            color: theme.palette.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.h1.fontSize as string,
          },
        },
      },
    },
    grid: { padding: { top: -30, bottom: 12 } },
    responsive: [
      { breakpoint: 1300, options: { grid: { padding: { left: 22 } } } },
      { breakpoint: theme.breakpoints.values.md, options: { grid: { padding: { left: 0 } } } },
    ],
  }

  return (
    <Card>
      <CardHeader
        title="Validation Health"
        subheader="Current inventory state"
        action={
          <OptionsMenu
            options={[{ text: 'Run Validation', href: '/validation/run', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item xs={12} sm={5}>
            {loading ? <Skeleton variant="text" width={80} height={56} /> : <Typography variant="h1">{total}</Typography>}
            <Typography sx={{ mb: 6, color: 'text.secondary' }}>Total Devices</Typography>
            {rows.map((item, index) => (
              <Box key={item.title} sx={{ display: 'flex', alignItems: 'center', mb: index !== rows.length - 1 ? 4 : undefined }}>
                <CustomAvatar skin="light" variant="rounded" color={item.avatarColor} sx={{ mr: 4, width: 34, height: 34 }}>
                  <Icon icon={item.avatarIcon} />
                </CustomAvatar>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    {loading ? <Skeleton variant="text" width={24} /> : item.subtitle}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} sm={7} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <Skeleton variant="circular" width={220} height={220} />
            ) : (
              <ReactApexcharts type="radialBar" height={325} options={options} series={[passPct]} />
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
