'use client'

/**
 * Devices tab -- UI-only migration of the old DevicesTab (previously
 * app/(app)/inventory/page.tsx). Same query key (['devices']), same
 * mutations (upsertDevice / deleteDevice / importDevices), same search
 * fields (IP, Device, Collector Region, Config Type), same ICMP/SNMPv3
 * classification. Presentation moved from a hand-rolled <table> to MUI
 * X Data Grid (sorting, pagination, column visibility, CSV export all
 * built in); Add/Edit moved to a right-hand FormDrawer; delete
 * confirmation moved from window.confirm() to ConfirmDialog; bulk
 * delete is new (loops the existing per-id deleteDevice call, no new
 * endpoint).
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
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import { api } from '@/lib/api'
import type { Device, ImportMode } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeviceFormDrawer } from './DeviceFormDrawer'
import { ImportDialog } from './ImportDialog'

const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

export function DevicesView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [editDevice, setEditDevice] = useState<Partial<Device> | null | 'new'>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selection, setSelection] = useState<GridRowSelectionModel>([])
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
  })

  const saveMut = useMutation({
    mutationFn: (d: Partial<Device>) => api.upsertDevice(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setEditDevice(null)
      toast('Device saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
  })

  const importMut = useMutation({
    mutationFn: ({ rows, mode }: { rows: unknown[]; mode: ImportMode }) => api.importDevices(rows, mode),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setImportOpen(false)
      toast(`Imported ${(res as { imported?: number }).imported ?? '?'} devices`, 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const devices = data?.devices ?? []
  const filtered = useMemo(() => {
    const list = data?.devices ?? []
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(
      (d) =>
        (d.IP ?? '').toLowerCase().includes(q) ||
        (d.Device ?? '').toLowerCase().includes(q) ||
        (d['Collector Region'] ?? '').toLowerCase().includes(q) ||
        (d['Config Type'] ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  async function doDelete(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync(id)))
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      setSelection([])
      toast(ids.length > 1 ? `${ids.length} devices deleted` : 'Device deleted', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: GridColDef<Device>[] = [
    { field: 'IP', headerName: 'IP Address', flex: 1, minWidth: 130 },
    {
      field: 'Device',
      headerName: 'Device',
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => params.row.Device ?? '',
    },
    {
      field: 'Collector Region',
      headerName: 'Region',
      flex: 1,
      minWidth: 140,
      renderCell: ({ value }) =>
        value ? value : <Chip label="missing" size="small" color="warning" variant="outlined" />,
    },
    {
      field: 'Config Type',
      headerName: 'Type',
      flex: 0.8,
      minWidth: 110,
      valueGetter: (params) => params.row['Config Type'] ?? '—',
    },
    {
      field: 'protocol',
      headerName: 'Protocol',
      flex: 0.7,
      minWidth: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const cfgType = ((row['Config Type'] as string) ?? '').toLowerCase().trim()
        const isIcmp = ICMP_TYPES.has(cfgType)
        return <Chip label={isIcmp ? 'ICMP' : 'SNMPv3'} size="small" color={isIcmp ? 'info' : 'default'} />
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditOutlinedIcon fontSize="small" />}
          label="Edit"
          onClick={() => setEditDevice(row)}
        />,
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

  if (devices.length === 0 && !search) {
    return (
      <EmptyState
        title="No devices yet"
        sub="Add one manually or import a spreadsheet to get started."
        action={
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditDevice('new')}>
            Add Device
          </Button>
        }
      />
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
              searchPlaceholder: 'Search IP, device name, region…',
              rightActions: (
                <>
                  {selection.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteSweepOutlinedIcon />}
                      onClick={() => setConfirmDelete({ ids: selection.map(String), label: `${selection.length} devices` })}
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
                    onClick={() => api.exportDownload('devices').catch((e) => toast(e.message, 'error'))}
                  >
                    Export XLSX
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setEditDevice('new')}>
                    Add Device
                  </Button>
                </>
              ),
            },
          }}
        />
      </Box>

      {editDevice !== null && (
        <DeviceFormDrawer
          open
          device={typeof editDevice === 'string' ? null : editDevice}
          onClose={() => setEditDevice(null)}
          onSave={(d) => saveMut.mutate(d)}
          saving={saveMut.isPending}
        />
      )}

      <ImportDialog
        open={importOpen}
        label="Devices"
        onClose={() => setImportOpen(false)}
        onImport={(rows, mode) => importMut.mutate({ rows, mode })}
      />

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete device(s)"
          message={`Delete ${confirmDelete.label}? This cannot be undone.`}
          onConfirm={() => doDelete(confirmDelete.ids)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </Box>
  )
}
