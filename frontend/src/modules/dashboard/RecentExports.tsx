'use client'

/**
 * Recent Exports -- ConfigFoundry operational widget, restyled as a Vuexy
 * Data Table (Card + CardHeader + MUI X DataGrid -- the same DataGrid
 * component + theme overrides already used for Inventory/Audit Logs, i.e.
 * the "Vuexy Data Table" referenced in the brief for this app).
 *
 * Data: api.getHistory(5) (['history', 5], already used pre-migration).
 * There's no separate "export" log in the backend -- each Generate run *is*
 * the export (it produces the downloadable YAML files) -- so History remains
 * the real record here, same as before, just in a proper themed table
 * instead of a plain unstyled <Table>.
 */
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Skeleton from '@mui/material/Skeleton'
import Icon from '@/@core/components/icon'
import OptionsMenu from '@/@core/components/option-menu'
import type { HistoryEntry } from '@/lib/types'

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

export function RecentExports({ entries, loading }: { entries: HistoryEntry[]; loading: boolean }) {
  const rows = entries.map((e, i) => ({ ...e, _rowId: e.id ?? String(i) }))

  const columns: GridColDef<(typeof rows)[number]>[] = [
    { field: 'ts', headerName: 'Generated', flex: 1, minWidth: 160, valueGetter: (p) => fmtTs(p.row.ts) },
    { field: 'actor', headerName: 'By', flex: 1, minWidth: 140, valueGetter: (p) => p.row.actor ?? '—' },
    { field: 'summary', headerName: 'Summary', flex: 2, minWidth: 220, sortable: false, valueGetter: (p) => p.row.summary ?? '—' },
  ]

  return (
    <Card>
      <CardHeader
        title="Recent Exports"
        subheader="Latest configuration generation runs"
        action={
          <OptionsMenu
            options={[{ text: 'View History', href: '/configuration/generated', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      {loading ? (
        <Box sx={{ p: 4 }}>
          <Skeleton variant="rounded" height={200} />
        </Box>
      ) : (
        <DataGrid
          autoHeight
          hideFooter
          rows={rows}
          columns={columns}
          getRowId={(r) => r._rowId}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
          slots={{
            noRowsOverlay: () => (
              <Box sx={{ p: 6, textAlign: 'center' }}>No YAML generated yet.</Box>
            ),
          }}
        />
      )}
    </Card>
  )
}
