import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'

export interface BarDatum {
  label: string
  value: number
}

interface MiniBarChartProps {
  data: BarDatum[]
  color?: string
}

/**
 * Small dependency-free horizontal bar chart. No charting library added --
 * this only visualizes counts already computed from existing API data
 * (device Config Type / Collector Region breakdowns), so a full charting
 * package felt like unnecessary weight for two bars-with-a-count.
 */
export function MiniBarChart({ data, color = 'primary.main' }: MiniBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data yet.
      </Typography>
    )
  }

  return (
    <Stack spacing={1.25}>
      {data.map((d) => (
        <Box key={d.label}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
              {d.label}
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {d.value}
            </Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${(d.value / max) * 100}%`, bgcolor: color, borderRadius: 1 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
