'use client'

/**
 * Inventory Summary -- ported from Vuexy's AnalyticsEarningReports.tsx (big
 * stat + bar chart + 3 stat rows with progress bars), replacing "Earning
 * Reports" / fake weekly $ earnings.
 *
 * Demo content removed: $468 +4.2%, Mo-Su weekly bar chart, Earnings/Profit/
 * Expense rows.
 *
 * Data: api.getMeta() (['meta']) for the headline total and the 3 stat rows;
 * api.getDevices() (['devices']) for the bar chart -- categorical breakdown
 * by Config Type (real current-state counts, not a fabricated time series --
 * there's no "config types over time" concept in this data).
 */
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import CustomChip from '@/@core/components/mui/chip'
import OptionsMenu from '@/@core/components/option-menu'
import ReactApexcharts from '@/@core/components/react-apexcharts'
import { hexToRGBA } from '@/@core/utils/hex-to-rgba'
import type { Device, Meta } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'

interface Row {
  title: string
  stats: number
  avatarIcon: string
  avatarColor: ThemeColor
  progressColor: ThemeColor
}

export function InventorySummary({ meta, devices, loading }: { meta: Meta | undefined; devices: Device[]; loading: boolean }) {
  const theme = useTheme()

  const total = (meta?.deviceCount ?? 0) + (meta?.bandwidthCount ?? 0) + (meta?.subnetCount ?? 0)
  const rows: Row[] = [
    { title: 'Devices', stats: meta?.deviceCount ?? 0, avatarIcon: 'tabler:box', avatarColor: 'primary', progressColor: 'primary' },
    { title: 'Bandwidth Rows', stats: meta?.bandwidthCount ?? 0, avatarIcon: 'tabler:gauge', avatarColor: 'info', progressColor: 'info' },
    { title: 'Subnets', stats: meta?.subnetCount ?? 0, avatarIcon: 'tabler:topology-star-3', avatarColor: 'secondary', progressColor: 'secondary' },
  ]

  // Real categorical breakdown -- devices by Config Type. Same computation
  // the previous Dashboard pass already used.
  const configTypeCounts = new Map<string, number>()
  for (const d of devices) {
    const ct = ((d['Config Type'] as string) || 'Unspecified').trim() || 'Unspecified'
    configTypeCounts.set(ct, (configTypeCounts.get(ct) ?? 0) + 1)
  }
  const categories = Array.from(configTypeCounts.keys())
  const series = [{ data: Array.from(configTypeCounts.values()) }]

  const options: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: {
      bar: { borderRadius: 6, distributed: true, columnWidth: '42%' },
    },
    legend: { show: false },
    tooltip: { enabled: true },
    dataLabels: { enabled: false },
    colors: categories.map(() => hexToRGBA(theme.palette.primary.main, 0.6)),
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    grid: { show: false, padding: { top: -28, left: -9, right: -10, bottom: -12 } },
    xaxis: {
      axisTicks: { show: false },
      axisBorder: { show: false },
      categories,
      labels: {
        style: {
          colors: theme.palette.text.disabled,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string,
        },
      },
    },
    yaxis: { show: false },
  }

  return (
    <Card>
      <CardHeader
        sx={{ pb: 0 }}
        title="Inventory Summary"
        subheader="Devices by config type"
        action={
          <OptionsMenu
            options={[{ text: 'View Inventory', href: '/inventory/devices', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item sm={5} xs={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
            <Box sx={{ mb: 3, rowGap: 1, columnGap: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              {loading ? <Skeleton variant="text" width={80} height={56} /> : <Typography variant="h1">{total}</Typography>}
              <CustomChip rounded size="small" skin="light" color="primary" label="items" />
            </Box>
            <Typography variant="body2">Devices, bandwidth rows, and subnets combined</Typography>
          </Grid>
          <Grid item xs={12} sm={7}>
            {loading || categories.length === 0 ? (
              <Skeleton variant="rounded" height={163} />
            ) : (
              <ReactApexcharts type="bar" height={163} series={series} options={options} />
            )}
          </Grid>
        </Grid>
        <Box sx={{ mt: 6, borderRadius: 1, p: theme.spacing(4, 5), border: `1px solid ${theme.palette.divider}` }}>
          <Grid container spacing={6}>
            {rows.map((row) => {
              const pct = total === 0 ? 0 : Math.round((row.stats / total) * 100)
              return (
                <Grid item xs={12} sm={4} key={row.title}>
                  <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
                    <CustomAvatar skin="light" variant="rounded" color={row.avatarColor} sx={{ mr: 2, width: 26, height: 26 }}>
                      <Icon fontSize="1.125rem" icon={row.avatarIcon} />
                    </CustomAvatar>
                    <Typography variant="h6">{row.title}</Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="text" width={50} height={38} />
                  ) : (
                    <Typography variant="h4" sx={{ mb: 2.5 }}>
                      {row.stats}
                    </Typography>
                  )}
                  <LinearProgress variant="determinate" value={pct} color={row.progressColor} sx={{ height: 4 }} />
                </Grid>
              )
            })}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}
