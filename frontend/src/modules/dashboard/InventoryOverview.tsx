'use client'

/**
 * Inventory Overview -- replaces Vuexy's "Website Analytics" slider.
 *
 * Per approved mapping: NOT porting keen-slider or the marketing
 * illustrations (no meaningful inventory equivalent for stock-photo people
 * standing next to fake session/conversion cards). Instead this reuses a
 * standard Vuexy Card + the same CustomAvatar/Icon stat-block pattern already
 * present elsewhere on this dashboard (AnalyticsEarningReports' bottom row),
 * so nothing new is invented visually -- just reused in a Card instead of a
 * carousel.
 *
 * Data: api.getMeta() (['meta'], already used app-wide) -- current-state
 * counts, no fabricated trend.
 */
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import OptionsMenu from '@/@core/components/option-menu'
import type { Meta } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'

interface StatItem {
  title: string
  stats: string | number
  avatarIcon: string
  avatarColor: ThemeColor
}

export function InventoryOverview({ meta, loading }: { meta: Meta | undefined; loading: boolean }) {
  const items: StatItem[] = [
    { title: 'Devices', stats: meta?.deviceCount ?? 0, avatarIcon: 'tabler:box', avatarColor: 'primary' },
    { title: 'Bandwidth Rows', stats: meta?.bandwidthCount ?? 0, avatarIcon: 'tabler:gauge', avatarColor: 'info' },
    { title: 'Subnets', stats: meta?.subnetCount ?? 0, avatarIcon: 'tabler:topology-star-3', avatarColor: 'secondary' },
  ]

  return (
    <Card>
      <CardHeader
        title="Inventory Overview"
        subheader="Current inventory counts"
        action={
          <OptionsMenu
            options={[{ text: 'View Inventory', href: '/inventory/devices', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      <CardContent>
        <Grid container spacing={6}>
          {items.map((item) => (
            <Grid item xs={12} sm={4} key={item.title}>
              <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
                <CustomAvatar skin="light" variant="rounded" color={item.avatarColor} sx={{ mr: 2, width: 34, height: 34 }}>
                  <Icon fontSize="1.25rem" icon={item.avatarIcon} />
                </CustomAvatar>
                <Typography variant="h6">{item.title}</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="text" width={60} height={40} />
              ) : (
                <Typography variant="h4">{item.stats}</Typography>
              )}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
