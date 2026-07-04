'use client'

/**
 * Audit Logs -- NEW dedicated page (route: /admin/audit-logs, added to the
 * sidebar's Administration group). This is the one net-new route added in
 * this migration pass: core/services already write to the audit log and
 * GET /api/v1/audit already exists and is already called from the
 * Dashboard (api.getAudit()) -- there just wasn't a standalone page for
 * browsing it before. Same query, no new backend endpoint.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import Typography from '@mui/material/Typography'
import { api } from '@/lib/api'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/providers/AuthProvider'
import { formatActor, formatAction, formatDetails as detailsToText } from '@/lib/auditFormat'

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

export function AuditLogsView() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'timeline'>('table')
  const { user } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['audit', 200], queryFn: () => api.getAudit(200) })

  const entries = data?.entries ?? []
  const filtered = useMemo(() => {
    const list = data?.entries ?? []
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(
      (e) =>
        (e.actor ?? '').toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.entity ?? '').toLowerCase().includes(q) ||
        detailsToText(e.details).toLowerCase().includes(q),
    )
  }, [data, search])

  const rows = filtered.map((e, i) => ({ ...e, _rowId: e.id ?? String(i) }))

  const columns: GridColDef<(typeof rows)[number]>[] = [
    { field: 'ts', headerName: 'Time', flex: 1, minWidth: 170, valueGetter: (p) => fmtTs(p.row.ts) },
    { field: 'actor', headerName: 'Actor', flex: 1, minWidth: 140, valueGetter: (p) => formatActor(p.row.actor, user?.id) },
    { field: 'action', headerName: 'Action', flex: 1, minWidth: 160, valueGetter: (p) => formatAction(p.row.action) },
    { field: 'entity', headerName: 'Entity', flex: 1, minWidth: 140, valueGetter: (p) => p.row.entity ?? '—' },
    { field: 'details', headerName: 'Details', flex: 1.5, minWidth: 200, sortable: false, valueGetter: (p) => detailsToText(p.row.details) },
  ]

  if (isLoading) return <Skeleton variant="rounded" height={420} />
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        {(error as Error).message}
      </Alert>
    )
  }

  if (entries.length === 0) {
    return <EmptyState title="No activity recorded yet" />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_e, v) => v && setView(v)}>
          <ToggleButton value="table">
            <TableRowsOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> Table
          </ToggleButton>
          <ToggleButton value="timeline">
            <TimelineOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> Timeline
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'table' ? (
        <Box sx={{ height: 620, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r._rowId}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'ts', sort: 'desc' }] } }}
            pageSizeOptions={[10, 25, 50, 100]}
            slots={{ toolbar: DataGridToolbar }}
            slotProps={{ toolbar: { searchValue: search, onSearchChange: setSearch, searchPlaceholder: 'Search actor, action, entity…' } }}
          />
        </Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Timeline sx={{ p: 0, m: 0 }}>
              {rows.slice(0, 100).map((e, i) => (
                <TimelineItem key={e._rowId}>
                  <TimelineOppositeContent sx={{ flex: 0.25, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">
                      {fmtTs(e.ts)}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="primary" variant="outlined" />
                    {i < rows.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ pb: 2.5 }}>
                    <Typography variant="body2">
                      <strong>{formatActor(e.actor, user?.id)}</strong> {formatAction(e.action)}
                      {e.entity && <> · {e.entity}</>}
                    </Typography>
                    {detailsToText(e.details) && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {detailsToText(e.details)}
                      </Typography>
                    )}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
