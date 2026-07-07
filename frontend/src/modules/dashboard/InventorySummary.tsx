'use client'

/**
 * Inventory Summary -- devices-by-config-type breakdown. Originally ported
 * from Vuexy's AnalyticsEarningReports.tsx with a big total-items stat +
 * bar chart + 3 stat rows (Devices/Bandwidth Rows/Subnets) with progress
 * bars underneath. Simplified once DashboardKpiRow was added: that top KPI
 * rail already shows Devices/Bandwidth Rows/Subnets/Configs
 * Generated/Validation as five individually-clickable tiles, so repeating
 * the exact same 3 numbers again here (as a second "2657 items" hero stat
 * plus 3 duplicate progress rows) was pure redundancy, not new information.
 * This card now earns its place on the dashboard with the one thing it
 * uniquely offers: the categorical breakdown by Config Type, which nothing
 * else on the page shows.
 *
 * Data: api.getDevices() (['devices'], already used app-wide) -- real
 * current-state counts, no fabricated time series.
 */
import { useTheme } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { ApexOptions } from 'apexcharts'
import Icon from '@/@core/components/icon'
import OptionsMenu from '@/@core/components/option-menu'
import ReactApexcharts from '@/@core/components/react-apexcharts'
import { hexToRGBA } from '@/@core/utils/hex-to-rgba'
import type { Device } from '@/lib/types'

export function InventorySummary({ devices, loading }: { devices: Device[]; loading: boolean }) {
  const theme = useTheme()

  const configTypeCounts = new Map<string, number>()
  for (const d of devices) {
    const ct = ((d['Config Type'] as string) || 'Unspecified').trim() || 'Unspecified'
    configTypeCounts.set(ct, (configTypeCounts.get(ct) ?? 0) + 1)
  }
  const categories = Array.from(configTypeCounts.keys())
  const series = [{ data: Array.from(configTypeCounts.values()) }]

  const options: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '45%' } },
    legend: { show: false },
    tooltip: { enabled: true },
    dataLabels: { enabled: false },
    colors: categories.map(() => hexToRGBA(theme.palette.primary.main, 0.6)),
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    grid: { show: false, padding: { top: -20, left: -9, right: -10, bottom: -4 } },
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
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="Devices by Config Type"
        subheader={`${devices.length} device${devices.length === 1 ? '' : 's'} total`}
        action={
          <OptionsMenu
            options={[{ text: 'View Infrastructure', href: '/infrastructure/devices', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="rounded" height={260} />
        ) : categories.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No devices yet -- import your inventory to see a breakdown here.
            </Typography>
          </Box>
        ) : (
          <ReactApexcharts type="bar" height={260} series={series} options={options} />
        )}
      </CardContent>
    </Card>
  )
}
