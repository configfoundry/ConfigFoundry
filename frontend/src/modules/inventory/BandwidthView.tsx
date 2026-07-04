'use client'

/**
 * Bandwidth tab -- UI-only migration of the old BandwidthTab. Same query
 * key (['bandwidth']), same mutations (upsertBandwidth / deleteBandwidth /
 * importBandwidth), same search fields (IP, Interface).
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
  type GridRowSelectionModel,
} from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import { api } from '@/lib/api'
import type { BandwidthRow, ImportMode } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { BandwidthFormDrawer } from './BandwidthFormDrawer'
import { ImportDialog } from './ImportDialog'

export function BandwidthView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [editRow, setEditRow] = useState<Partial<BandwidthRow> | null | 'new'>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selection, setSelection] = useState<GridRowSelectionModel>([])
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bandwidth'],
    queryFn: () => api.getBandwidth(),
  })

  const saveMut = useMutation({
    mutationFn: (row: Partial<BandwidthRow>) => api.upsertBandwidth(row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandwidth'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setEditRow(null)
      toast('Saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteBandwidth(id),
  })

  const importMut = useMutation({
    mutationFn: ({ rows, mode }: { rows: unknown[]; mode: ImportMode }) => api.importBandwidth(rows, mode),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bandwidth'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setImportOpen(false)
      toast(`Imported ${(res as { imported?: number }).imported ?? '?'} rows`, 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const rows = data?.rows ?? []
  const filtered = useMemo(() => {
    const list = data?.rows ?? []
    const q = search.toLowerCase()
    return q ? list.filter((r) => (r.IP ?? '').toLowerCase().includes(q) || (r.Interface ?? '').toLowerCase().includes(q)) : list
  }, [data, search])

  async function doDelete(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync(id)))
      qc.invalidateQueries({ queryKey: ['bandwidth'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setSelection([])
      toast(ids.length > 1 ? `${ids.length} rows deleted` : 'Deleted', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: GridColDef<BandwidthRow>[] = [
    { field: 'IP', headerName: 'IP Address', flex: 1, minWidth: 130 },
    { field: 'Interface', headerName: 'Interface', flex: 1, minWidth: 130, valueGetter: (params) => params.row.Interface ?? '—' },
    { field: 'Allocated BW', headerName: 'Allocated BW', flex: 0.8, minWidth: 130, valueGetter: (params) => params.row['Allocated BW'] ?? '—' },
    {
      field: 'Interface_description',
      headerName: 'Description',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (params) => params.row.Interface_description ?? '—',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem key="edit" icon={<EditOutlinedIcon fontSize="small" />} label="Edit" onClick={() => setEditRow(row)} />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteOutlineOutlinedIcon fontSize="small" />}
          label="Delete"
          onClick={() => setConfirmDelete({ ids: [row.id], label: row.IP })}
        />,
      ],
    },
  ]

  if (isLoading) return <Skeleton variant="rounded" height={420} />
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        {(error as Error).message}
      </Alert>
    )
  }

  if (rows.length === 0 && !search) {
    return (
      <>
        <EmptyState
          title="No bandwidth rows yet"
          sub="Import or add bandwidth cap entries."
          action={
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditRow('new')}>
                Add Row
              </Button>
              <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={() => setImportOpen(true)}>
                Import from Excel
              </Button>
            </Stack>
          }
        />

        {editRow !== null && (
          <BandwidthFormDrawer
            open
            row={typeof editRow === 'string' ? null : editRow}
            onClose={() => setEditRow(null)}
            onSave={(r) => saveMut.mutate(r)}
            saving={saveMut.isPending}
          />
        )}

        <ImportDialog
          open={importOpen}
          label="Bandwidth Rows"
          onClose={() => setImportOpen(false)}
          onImport={(rows2, mode) => importMut.mutate({ rows: rows2, mode })}
        />
      </>
    )
  }

  return (
    <Box>
      <Box sx={{ height: 620, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'IP', sort: 'asc' }] },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          slots={{ toolbar: DataGridToolbar }}
          slotProps={{
            toolbar: {
              searchValue: search,
              onSearchChange: setSearch,
              searchPlaceholder: 'Search IP, interface…',
              rightActions: (
                <>
                  {selection.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteSweepOutlinedIcon />}
                      onClick={() => setConfirmDelete({ ids: selection.map(String), label: `${selection.length} rows` })}
                    >
                      Delete {selection.length} selected
                    </Button>
                  )}
                  <Button size="small" startIcon={<FileUploadOutlinedIcon />} onClick={() => setImportOpen(true)}>
                    Import from Excel
                  </Button>
                  <Button
                    size="small"
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={() => api.exportDownload('bandwidth').catch((e) => toast(e.message, 'error'))}
                  >
                    Export XLSX
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditRow('new')}>
                    Add Row
                  </Button>
                </>
              ),
            },
          }}
        />
      </Box>

      {editRow !== null && (
        <BandwidthFormDrawer
          open
          row={typeof editRow === 'string' ? null : editRow}
          onClose={() => setEditRow(null)}
          onSave={(r) => saveMut.mutate(r)}
          saving={saveMut.isPending}
        />
      )}

      <ImportDialog
        open={importOpen}
        label="Bandwidth Rows"
        onClose={() => setImportOpen(false)}
        onImport={(rows2, mode) => importMut.mutate({ rows: rows2, mode })}
      />

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete row(s)"
          message={`Delete ${confirmDelete.label}? This cannot be undone.`}
          onConfirm={() => doDelete(confirmDelete.ids)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </Box>
  )
}
