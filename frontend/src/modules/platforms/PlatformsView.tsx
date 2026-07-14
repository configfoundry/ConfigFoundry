'use client'

/**
 * Monitoring Platforms hub (ADR-0008).
 *
 * Replaces the old single-workflow Generate page as the landing view at
 * /configuration/generate. Renders one card per entry returned by
 * GET /api/v1/platforms -- nothing here is hardcoded, so adding a platform
 * to core/platforms/registry.py is enough to make a new card appear, no
 * frontend change required. "Exporter" never appears in this UI; every
 * user-facing string says "Platform" / "Monitoring Platform".
 *
 * Logos are the official brand marks from the @iconify-json/logos package,
 * bundled locally at build time (src/iconify-bundle/logos-icons.json, see
 * scripts/generate-logos-icon-bundle.mjs) -- never fetched from a live CDN,
 * per ADR-0003's air-gap requirement.
 */
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Icon from '@/@core/components/icon'
import { StatusChip } from '@/components/common/StatusChip'
import { api } from '@/lib/api'
import type { Platform } from '@/lib/types'

function PlatformCard({ platform }: { platform: Platform }) {
  const router = useRouter()
  const supported = platform.status === 'supported'

  const content = (
    <CardContent>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Icon icon={`logos:${platform.icon}`} fontSize="1.75rem" />
        </Box>
        <StatusChip
          label={supported ? 'Available' : 'Coming Soon'}
          tone={supported ? 'success' : 'neutral'}
        />
      </Stack>
      <Typography variant="h6" fontWeight={600}>
        {platform.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: '2.5em' }}>
        {platform.description || `Generate ${platform.name} monitoring configuration`}
      </Typography>
      {supported && platform.version && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          v{platform.version}
        </Typography>
      )}
    </CardContent>
  )

  if (!supported) {
    return (
      <Tooltip title={`${platform.name} support is coming soon`}>
        <Card variant="outlined" sx={{ height: '100%', opacity: 0.55 }}>
          {content}
        </Card>
      </Tooltip>
    )
  }

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea
        onClick={() => router.push(`/configuration/generate/${platform.id}`)}
        sx={{ height: '100%' }}
      >
        {content}
      </CardActionArea>
    </Card>
  )
}

export function PlatformsView() {
  const { data: platforms, isLoading, isError } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatforms(),
  })

  if (isError) {
    return <Alert severity="error">Couldn&apos;t load monitoring platforms. Try refreshing the page.</Alert>
  }

  return (
    <Grid container spacing={4}>
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
        ))}
      {!isLoading &&
        platforms?.map((platform) => (
          <Grid item xs={12} sm={6} md={4} key={platform.id}>
            <PlatformCard platform={platform} />
          </Grid>
        ))}
    </Grid>
  )
}
