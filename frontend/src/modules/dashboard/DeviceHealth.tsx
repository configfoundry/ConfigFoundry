'use client'

/**
 * Device Health -- ported from Vuexy's AnalyticsOrderVisits.tsx (internally
 * titled "Sales Overview"), same layout: big stat + two-value split with a
 * divider avatar + a LinearProgress bar.
 *
 * Demo content removed: "$42.5k +18.2%", "Order 62.2% / Visits 25.5%".
 * Real data: api.getDevices() (['devices'], already used by Inventory/Validation)
 * computed client-side -- same missingRegion/missingCreds logic already used
 * elsewhere in this app, no new business logic. "Configured" = has a
 * Collector Region and (if SNMP) credentials; "Needs Attention" = missing
 * either.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import type { Device } from '@/lib/types'

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

export function DeviceHealth({ devices, loading }: { devices: Device[]; loading: boolean }) {
  const total = devices.length

  const needsAttention = devices.filter((d) => {
    const isIcmp = ICMP_TYPES.has(((d['Config Type'] as string) ?? '').toLowerCase().trim())
    const missingRegion = !d['Collector Region']
    const missingCreds = !isIcmp && !d.snmpUser
    return missingRegion || missingCreds
  }).length
  const configured = total - needsAttention
  const healthPct = total === 0 ? 100 : Math.round((configured / total) * 100)
  const configuredPct = total === 0 ? 0 : Math.round((configured / total) * 100)
  const attentionPct = total === 0 ? 0 : Math.round((needsAttention / total) * 100)

  return (
    <Card>
      <CardContent sx={{ p: (theme) => `${theme.spacing(5)} !important` }}>
        <Box sx={{ gap: 2, mb: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              Device Health
            </Typography>
            {loading ? <Skeleton variant="text" width={90} height={40} /> : <Typography variant="h4">{healthPct}%</Typography>}
          </div>
          <Typography sx={{ fontWeight: 500, color: healthPct >= 90 ? 'success.main' : healthPct >= 75 ? 'warning.main' : 'error.main' }}>
            {total} device{total === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Box sx={{ mb: 3.5, gap: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ py: 2.25, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <CustomAvatar skin="light" color="success" variant="rounded" sx={{ mr: 1.5, height: 24, width: 24 }}>
                <Icon icon="tabler:check" fontSize="1.125rem" />
              </CustomAvatar>
              <Typography sx={{ color: 'text.secondary' }}>Configured</Typography>
            </Box>
            <Typography variant="h5">{configuredPct}%</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {configured}
            </Typography>
          </Box>
          <Divider flexItem sx={{ m: 0 }} orientation="vertical">
            <CustomAvatar skin="light" color="secondary" sx={{ height: 24, width: 24, fontSize: '0.6875rem', color: 'text.secondary' }}>
              VS
            </CustomAvatar>
          </Divider>
          <Box sx={{ py: 2.25, display: 'flex', alignItems: 'flex-end', flexDirection: 'column' }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 1.5, color: 'text.secondary' }}>Needs Attention</Typography>
              <CustomAvatar skin="light" color="warning" variant="rounded" sx={{ height: 24, width: 24 }}>
                <Icon icon="tabler:alert-triangle" fontSize="1.125rem" />
              </CustomAvatar>
            </Box>
            <Typography variant="h5">{attentionPct}%</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {needsAttention}
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          value={configuredPct}
          color="success"
          variant="determinate"
          sx={{
            height: 10,
            '&.MuiLinearProgress-colorSuccess': { backgroundColor: 'warning.main' },
            '& .MuiLinearProgress-bar': { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
          }}
        />
      </CardContent>
    </Card>
  )
}
