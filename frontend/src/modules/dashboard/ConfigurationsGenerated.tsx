'use client'

/**
 * Configurations Generated -- reuses Vuexy's CardStatsWithAreaChart exactly
 * (@core/components/card-statistics/card-stats-with-area-chart), replacing
 * "Revenue Generated" / fake $97.5k sparkline.
 *
 * Data: api.getHistory() (['history'], already used by the Generate/History
 * pages) -- each entry is a real past generation run with a timestamp.
 *
 * "Never fabricate trends" honored directly: the sparkline is only ever real
 * per-day counts of actual history entries. If fewer than 2 distinct days of
 * history exist (not enough real data to draw a trend from), the chart is
 * omitted and a plain current-state stat is shown instead -- no synthetic
 * points are invented to fill the shape.
 */
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import CustomAvatar from '@/@core/components/mui/avatar'
import Icon from '@/@core/components/icon'
import CardStatsWithAreaChart from '@/@core/components/card-statistics/card-stats-with-area-chart'
import type { HistoryEntry } from '@/lib/types'

function dayKey(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts.slice(0, 10) : d.toISOString().slice(0, 10)
}

export function ConfigurationsGenerated({ entries, loading }: { entries: HistoryEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="rounded" height={182} />
        </CardContent>
      </Card>
    )
  }

  const byDay = new Map<string, number>()
  for (const e of entries) {
    const key = dayKey(e.ts)
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  const sortedDays = Array.from(byDay.keys()).sort()
  const hasRealTrend = sortedDays.length >= 2

  if (hasRealTrend) {
    const series = [{ data: sortedDays.map((d) => byDay.get(d) ?? 0) }]
    return (
      <CardStatsWithAreaChart
        stats={String(entries.length)}
        title="Configurations Generated"
        avatarIcon="tabler:file-code"
        avatarColor="success"
        chartColor="success"
        chartSeries={series}
      />
    )
  }

  // Not enough real historical spread to draw a trend -- current-state only.
  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <CustomAvatar skin="light" color="success" sx={{ mb: 2.5, width: 42, height: 42 }}>
          <Icon icon="tabler:file-code" fontSize="1.625rem" />
        </CustomAvatar>
        <Typography variant="h5">{entries.length}</Typography>
        <Typography variant="body2">Configurations Generated</Typography>
      </CardContent>
    </Card>
  )
}
