'use client'

/**
 * Subnets tab -- UI-only migration of the old SubnetsTab. Same query key
 * (['subnets']), same mutations (upsertSubnet / deleteSubnet /
 * importSubnets), same search fields (CIDR, Description).
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
import type { Subnet, ImportMode } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SubnetFormDrawer } from './SubnetFormDrawer'
import { ImportDialog } from './ImportDialog'

export function SubnetsView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [editSubnet, setEditSubnet] = useState<Partial<Subnet> | null | 'new'>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selection, setSelection] = useState<GridRowSelectionModel>([])
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subnets'],
    queryFn: () => api.getSubnets(),
  })

  const saveMut = useMutation({
    mutationFn: (s: Partial<Subnet>) => api.upsertSubnet(s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subnets'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setEditSubnet(null)
      toast('Saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSubnet(id),
  })

  const importMut = useMutation({
    mutationFn: ({ rows, mode }: { rows: unknown[]; mode: ImportMode }) => api.importSubnets(rows, mode),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['subnets'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setImportOpen(false)
      toast(`Imported ${(res as { imported?: number }).imported ?? '?'} subnets`, 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const subnets = data?.subnets ?? []
  const filtered = useMemo(() => {
    const list = data?.subnets ?? []
    const q = search.toLowerCase()
    return q ? list.filter((s) => (s.CIDR ?? '').toLowerCase().includes(q) || (s.Description ?? '').toLowerCase().includes(q)) : list
  }, [data, search])

  async function doDelete(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync(id)))
      qc.invalidateQueries({ queryKey: ['subnets'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setSelection([])
      toast(ids.length > 1 ? `${ids.length} subnets deleted` : 'Deleted', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: GridColDef<Subnet>[] = [
    { field: 'CIDR', headerName: 'CIDR', flex: 1, minWidth: 160 },
    { field: 'Description', headerName: 'Description', flex: 1.5, minWidth: 200, valueGetter: (params) => params.row.Description ?? '—' },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem key="edit" icon={<EditOutlinedIcon fontSize="small" />} label="Edit" onClick={() => setEditSubnet(row)} />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteOutlineOutlinedIcon fontSize="small" />}
          label="Delete"
          onClick={() => setConfirmDelete({ ids: [row.id], label: row.CIDR })}
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

  if (subnets.length === 0 && !search) {
    return (
      <>
        <EmptyState
          title="No subnets yet"
          sub="Add one manually or import a spreadsheet to get started."
          action={
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditSubnet('new')}>
                Add Subnet
              </Button>
              <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={() => setImportOpen(true)}>
                Import from Excel
              </Button>
            </Stack>
          }
        />

        {editSubnet !== null && (
          <SubnetFormDrawer
            open
            subnet={typeof editSubnet === 'string' ? null : editSubnet}
            onClose={() => setEditSubnet(null)}
            onSave={(s) => saveMut.mutate(s)}
            saving={saveMut.isPending}
          />
        )}

        <ImportDialog
          open={importOpen}
          label="Subnets"
          onClose={() => setImportOpen(false)}
          onImport={(rows, mode) => importMut.mutate({ rows, mode })}
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
            sorting: { sortModel: [{ field: 'CIDR', sort: 'asc' }] },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          slots={{ toolbar: DataGridToolbar }}
          slotProps={{
            toolbar: {
              searchValue: search,
              onSearchChange: setSearch,
              searchPlaceholder: 'Search subnet, region…',
              rightActions: (
                <>
                  {selection.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteSweepOutlinedIcon />}
                      onClick={() => setConfirmDelete({ ids: selection.map(String), label: `${selection.length} subnets` })}
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
                    onClick={() => api.exportDownload('subnets').catch((e) => toast(e.message, 'error'))}
                  >
                    Export XLSX
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditSubnet('new')}>
                    Add Subnet
                  </Button>
                </>
              ),
            },
          }}
        />
      </Box>

      {editSubnet !== null && (
        <SubnetFormDrawer
          open
          subnet={typeof editSubnet === 'string' ? null : editSubnet}
          onClose={() => setEditSubnet(null)}
          onSave={(s) => saveMut.mutate(s)}
          saving={saveMut.isPending}
        />
      )}

      <ImportDialog
        open={importOpen}
        label="Subnets"
        onClose={() => setImportOpen(false)}
        onImport={(rows, mode) => importMut.mutate({ rows, mode })}
      />

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete subnet(s)"
          message={`Delete ${confirmDelete.label}? This cannot be undone.`}
          onConfirm={() => doDelete(confirmDelete.ids)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </Box>
  )
}
