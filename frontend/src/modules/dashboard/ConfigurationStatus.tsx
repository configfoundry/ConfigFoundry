'use client'

/**
 * Configuration Status -- the operations-dashboard brief explicitly asked
 * for a dedicated Configuration summary alongside Infrastructure/Validation
 * status, distinct from the bare "Configs Generated" number in the KPI row.
 * A horizontal status strip (not another stat card) on purpose: it sits
 * between the Infrastructure/Validation health row and Recent Activity,
 * reading like a pipeline status bar (Infrastructure -> Validation ->
 * Configuration) rather than one more square tile competing for the same
 * visual weight as the health panels above it.
 *
 * ConfigFoundry's backend has exactly one concept here -- a "generate" run
 * (see GenerationHistoryList.tsx header comment) -- there's no separate
 * success/failure outcome recorded per run, so this doesn't fabricate a
 * "3 failed" stat that doesn't exist; it shows what's real: whether a run
 * has ever happened, when the last one was, who ran it, and how many exist
 * in total, with the same fmtTs formatting style already used by
 * RecentActivity/GenerationHistoryList for consistency.
 */
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import CustomChip from '@/@core/components/mui/chip'
import type { HistoryEntry } from '@/lib/types'
import { formatActor } from '@/lib/auditFormat'
import { useAuth } from '@/providers/AuthProvider'

function fmtTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

export function ConfigurationStatus({ entries, loading }: { entries: HistoryEntry[]; loading: boolean }) {
  const { user } = useAuth()
  const latest = entries[0]

  return (
    <Card>
      <CardContent sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 220 }}>
            <CustomAvatar skin="light" variant="rounded" color={latest ? 'success' : 'secondary'} sx={{ width: 40, height: 40 }}>
              <Icon icon="tabler:file-code" fontSize="1.375rem" />
            </CustomAvatar>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Configuration Status</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Generate Configuration pipeline
              </Typography>
            </Box>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {loading ? (
            <Skeleton variant="text" width={260} height={32} />
          ) : !latest ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
              No configuration has been generated yet.
            </Typography>
          ) : (
            <Stack sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <CustomChip size="small" skin="light" rounded color="success" label="Last run completed" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {fmtTs(latest.ts)} · {formatActor(latest.actor, user?.id)}
                </Typography>
              </Stack>
              {latest.summary && (
                <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
                  {latest.summary}
                </Typography>
              )}
            </Stack>
          )}

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          <Box sx={{ textAlign: { xs: 'left', md: 'center' }, minWidth: 110 }}>
            <Typography variant="h5">{loading ? <Skeleton variant="text" width={30} /> : entries.length}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Total generated
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ ml: { md: 'auto' } }}>
            <Button variant="tonal" component={Link} href="/configuration/generated" startIcon={<Icon icon="tabler:files" />}>
              View Files
            </Button>
            <Button variant="contained" component={Link} href="/configuration/generate" startIcon={<Icon icon="tabler:wand" />}>
              Generate
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
