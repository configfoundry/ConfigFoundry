'use client'

/**
 * Shared list of past config-generation runs, read from GET /history.
 *
 * ConfigFoundry has exactly one backend concept here: a "generate" run
 * (core/validator.py runs, then YAML is written, then a history entry is
 * recorded -- see HistoryEntry/HistoryDetail in lib/types). There is no
 * separate "validation run" log and no separate "deployment" step in the
 * backend. Three sidebar entries now point at this same data because the
 * requested IA asks for three (Validation > Validation History,
 * Configuration > Generated Configurations, Configuration > Deployment
 * History) -- rather than inventing three different backend concepts that
 * don't exist, all three read the same /history feed through this one
 * component, with copy that's honest about that (see `subtitle` prop
 * usage at each call site).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Icon from '@/@core/components/icon'
import { api } from '@/lib/api'
import type { HistoryEntry } from '@/lib/types'
import { OnboardingEmptyState } from '@/components/common/OnboardingEmptyState'

function fmtTs(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function EntryFiles({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['history', id],
    queryFn: () => api.getHistoryEntry(id),
  })

  if (isLoading) return <Skeleton variant="rounded" height={240} />
  if (error) return <Typography variant="body2" color="text.secondary">Failed to load details.</Typography>
  if (!data) return null

  const files = Object.entries(data.files ?? {})
  if (files.length === 0) return <Typography variant="body2" color="text.secondary">No files recorded for this run.</Typography>

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {files.map(([name, content]) => (
        <Button
          key={name}
          size="small"
          variant="outlined"
          startIcon={<Icon icon="tabler:download" />}
          onClick={() => downloadFile(name, content)}
          sx={{ fontFamily: 'monospace', textTransform: 'none' }}
        >
          {name}
        </Button>
      ))}
    </Box>
  )
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow hover onClick={() => setOpen(o => !o)} sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 40 }}>
          <IconButton size="small">
            <Icon icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} />
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtTs(entry.ts)}</TableCell>
        <TableCell>{entry.summary ?? 'Generated'}</TableCell>
        <TableCell align="right">
          {entry.actor && <Chip size="small" label={entry.actor} variant="outlined" />}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <EntryFiles id={entry.id} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

interface Props {
  emptyTitle?: string
  emptySub?: string
}

export function GenerationHistoryList({
  emptyTitle = 'No configuration has been generated yet',
  emptySub = 'Generate configuration files from your validated inventory to see them here.',
}: Props) {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['history', 50],
    queryFn: () => api.getHistory(50),
  })

  if (isLoading) return <Skeleton variant="rounded" height={240} />
  if (error) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
        {(error as Error).message}
      </Alert>
    )
  }

  const entries = data?.entries ?? []
  if (entries.length === 0) {
    return (
      <Card>
        <OnboardingEmptyState
          icon="tabler:file-code"
          title={emptyTitle}
          description={emptySub}
          primaryLabel="Generate Configuration"
          primaryIcon="tabler:wand"
          onPrimary={() => router.push('/configuration/generate')}
          secondaryLabel="Review Inventory"
          onSecondary={() => router.push('/inventory/devices')}
          docsHref="/documentation/configuration"
        />
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Time</TableCell>
            <TableCell>Summary</TableCell>
            <TableCell align="right">Actor</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(e => <EntryRow key={e.id} entry={e} />)}
        </TableBody>
      </Table>
    </Card>
  )
}
