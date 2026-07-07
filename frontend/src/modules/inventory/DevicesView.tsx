'use client'

/**
 * Devices tab -- restyled per the approved Inventory mapping (Vuexy Apps ->
 * User List, since this licensed bundle has no eCommerce Product List page;
 * see chat for that verification). Ported structure from
 * pages/apps/user/list/index.tsx: Card > CardHeader "Search Filters" + 3
 * filter selects > Divider > TableHeader-style action row > DataGrid, with
 * a per-row IconButton+Menu "RowOptions" identical to that file's pattern.
 *
 * Business logic is 100% unchanged from the pre-restyle version: same query
 * key (['devices']), same mutations (upsertDevice / deleteDevice /
 * importDevices), same search fields (IP, Device, Collector Region, Config
 * Type), same ICMP/SNMPv3 classification, same bulk delete (loops the
 * existing per-id deleteDevice call).
 *
 * Column mapping (approved -- every column backed by a real field, nothing
 * invented):
 *   Avatar        -> Device Type icon. "Device Type" is NOT a built-in
 *                     field -- it was explicitly retired in favor of the
 *                     dynamic tag system (core/migrations_legacy.py). It's
 *                     read here as an optional tag (d['Device Type']); if an
 *                     admin hasn't defined that tag yet, every device shows
 *                     the honest "Unknown" icon -- nothing is guessed.
 *   User Name      -> Hostname (real field: Device)
 *   Email          -> IP Address (real field: IP) -- combined into one
 *                     identity column with Hostname, same as Vuexy stacks
 *                     fullName/email
 *   Role           -> Config Type (real field, values: SNMP / ICMP /
 *                     SNMP Trap / Storage / unset)
 *   Plan           -> Region (real field: Collector Region)
 *   Status         -> Device Status: Configured / Needs Attention, derived
 *                     from the same missing-region/missing-creds logic used
 *                     by the Dashboard's Device Health widget. There is no
 *                     real "Disabled" state for a device anywhere in the
 *                     schema/backend, so that option from the reference
 *                     list is intentionally not implemented -- adding it
 *                     would be a fabricated status with no backing data.
 *   Protocol chip  -> kept as its own column per instruction (ICMP vs
 *                     SNMPv3), not merged into Config Type.
 *   Actions        -> unchanged Edit/Delete, restyled as Vuexy's
 *                     IconButton+Menu RowOptions instead of
 *                     GridActionsCellItem + @mui/icons-material.
 *
 * Filters: kept the existing free-text search (now in a Vuexy-styled
 * TableHeader row) and added the Region/Config Type/Status select filters
 * from the User List reference -- their option lists are derived from real
 * data (distinct regions actually present, the real Config Type enum, the
 * two real status values), not invented lists.
 */
import { useMemo, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'
import CustomChip from '@/@core/components/mui/chip'
import CustomTextField from '@/@core/components/mui/text-field'
import { api } from '@/lib/api'
import type { Device, ImportMode } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeviceFormDrawer } from './DeviceFormDrawer'
import { ImportDialog } from './ImportDialog'
import { ICMP_TYPES, STATUS_META, deviceStatus, deviceTypeMeta, configTypeMeta } from './deviceMeta'

/** Per-row action menu -- ported from Vuexy's User List RowOptions (IconButton
 * + Menu + MenuItem), replacing GridActionsCellItem + @mui/icons-material.
 * "View" now links to the Device Details page (/infrastructure/details?id=...)
 * -- this item was intentionally omitted when this menu was first built,
 * since no such page existed yet; now that it does, this is the only place
 * a user can reach it from the list. Query-param route, not a dynamic
 * segment -- see app/(app)/infrastructure/details/page.tsx for why
 * (output:'export' static builds can't pre-render an unbounded set of
 * backend-generated device IDs as path segments). */
function DeviceRowOptions({ deviceId, onEdit, onDelete }: { deviceId: string; onEdit: () => void; onDelete: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton size="small" onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}>
        <Icon icon="tabler:dots-vertical" />
      </IconButton>
      <Menu
        keepMounted
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ style: { minWidth: '8rem' } }}
      >
        <MenuItem
          component={Link}
          href={`/infrastructure/details?id=${encodeURIComponent(deviceId)}`}
          sx={{ '& svg': { mr: 2 } }}
          onClick={() => setAnchorEl(null)}
        >
          <Icon icon="tabler:eye" fontSize={20} />
          View
        </MenuItem>
        <MenuItem
          sx={{ '& svg': { mr: 2 } }}
          onClick={() => {
            setAnchorEl(null)
            onEdit()
          }}
        >
          <Icon icon="tabler:edit" fontSize={20} />
          Edit
        </MenuItem>
        <MenuItem
          sx={{ '& svg': { mr: 2 } }}
          onClick={() => {
            setAnchorEl(null)
            onDelete()
          }}
        >
          <Icon icon="tabler:trash" fontSize={20} />
          Delete
        </MenuItem>
      </Menu>
    </>
  )
}

export function DevicesView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [configTypeFilter, setConfigTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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

  const devices = useMemo(() => data?.devices ?? [], [data])

  const regionOptions = useMemo(
    () =>
      Array.from(new Set(devices.map((d) => ((d['Collector Region'] as string) ?? '').trim()).filter(Boolean))).sort(),
    [devices],
  )

  const filtered = useMemo(() => {
    let list = devices
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (d) =>
          (d.IP ?? '').toLowerCase().includes(q) ||
          (d.Device ?? '').toLowerCase().includes(q) ||
          (d['Collector Region'] ?? '').toLowerCase().includes(q) ||
          (d['Config Type'] ?? '').toLowerCase().includes(q),
      )
    }
    if (regionFilter) list = list.filter((d) => ((d['Collector Region'] as string) ?? '') === regionFilter)
    if (configTypeFilter) list = list.filter((d) => ((d['Config Type'] as string) ?? '') === configTypeFilter)
    if (statusFilter) list = list.filter((d) => deviceStatus(d) === statusFilter)
    return list
  }, [devices, search, regionFilter, configTypeFilter, statusFilter])

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
    {
      field: 'Device',
      headerName: 'Device',
      flex: 1.3,
      minWidth: 260,
      valueGetter: (params) => params.row.Device ?? '',
      renderCell: ({ row }) => {
        const meta = deviceTypeMeta(row)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CustomAvatar skin="light" variant="rounded" color={meta.color} sx={{ mr: 3, width: 34, height: 34 }}>
              <Icon icon={meta.icon} />
            </CustomAvatar>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography noWrap sx={{ fontWeight: 500, color: 'text.secondary' }}>
                {row.Device || '(unnamed)'}
              </Typography>
              <Typography noWrap variant="body2" sx={{ color: 'text.disabled' }}>
                {row.IP}
              </Typography>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'Config Type',
      headerName: 'Config Type',
      flex: 0.9,
      minWidth: 160,
      valueGetter: (params) => params.row['Config Type'] ?? '',
      renderCell: ({ row }) => {
        const meta = configTypeMeta(row)
        const label = (row['Config Type'] as string) || 'Unset'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CustomAvatar skin="light" sx={{ mr: 3, width: 30, height: 30 }} color={meta.color}>
              <Icon icon={meta.icon} fontSize="1.125rem" />
            </CustomAvatar>
            <Typography noWrap sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'Collector Region',
      headerName: 'Region',
      flex: 0.8,
      minWidth: 140,
      valueGetter: (params) => params.row['Collector Region'] ?? '',
      renderCell: ({ value }) =>
        value ? (
          <Typography noWrap sx={{ color: 'text.secondary' }}>
            {value}
          </Typography>
        ) : (
          <CustomChip rounded skin="light" size="small" color="warning" label="missing" />
        ),
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
        return <CustomChip rounded skin="light" size="small" label={isIcmp ? 'ICMP' : 'SNMPv3'} color={isIcmp ? 'info' : 'primary'} />
      },
    },
    {
      field: 'deviceStatus',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const status = STATUS_META[deviceStatus(row)]
        return <CustomChip rounded skin="light" size="small" label={status.label} color={status.color} />
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <DeviceRowOptions
          deviceId={row.id}
          onEdit={() => setEditDevice(row)}
          onDelete={() => setConfirmDelete({ ids: [row.id], label: row.IP })}
        />
      ),
    },
  ]

  if (isLoading) return <Skeleton variant="rounded" height={480} />
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        {(error as Error).message}
      </Alert>
    )
  }

  if (devices.length === 0 && !search) {
    return (
      <>
        <EmptyState
          title="No devices yet"
          sub="Add one manually or import a spreadsheet to get started."
          action={
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<Icon icon="tabler:plus" />} onClick={() => setEditDevice('new')}>
                Add Device
              </Button>
              <Button color="secondary" variant="tonal" startIcon={<Icon icon="tabler:upload" />} onClick={() => setImportOpen(true)}>
                Import from Excel
              </Button>
            </Stack>
          }
        />

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
      </>
    )
  }

  return (
    <Card>
      <CardHeader title="Search Filters" />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item sm={4} xs={12}>
            <CustomTextField
              select
              fullWidth
              defaultValue=""
              SelectProps={{ value: regionFilter, displayEmpty: true, onChange: (e) => setRegionFilter(e.target.value as string) }}
            >
              <MenuItem value="">All Regions</MenuItem>
              {regionOptions.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item sm={4} xs={12}>
            <CustomTextField
              select
              fullWidth
              defaultValue=""
              SelectProps={{ value: configTypeFilter, displayEmpty: true, onChange: (e) => setConfigTypeFilter(e.target.value as string) }}
            >
              <MenuItem value="">All Config Types</MenuItem>
              <MenuItem value="SNMP">SNMP</MenuItem>
              <MenuItem value="ICMP">ICMP</MenuItem>
              <MenuItem value="SNMP Trap">SNMP Trap</MenuItem>
              <MenuItem value="Storage">Storage</MenuItem>
            </CustomTextField>
          </Grid>
          <Grid item sm={4} xs={12}>
            <CustomTextField
              select
              fullWidth
              defaultValue=""
              SelectProps={{ value: statusFilter, displayEmpty: true, onChange: (e) => setStatusFilter(e.target.value as string) }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="configured">Configured</MenuItem>
              <MenuItem value="attention">Needs Attention</MenuItem>
            </CustomTextField>
          </Grid>
        </Grid>
      </CardContent>
      <Divider sx={{ m: '0 !important' }} />

      <Box sx={{ py: 4, px: 6, rowGap: 2, columnGap: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button color="secondary" variant="tonal" startIcon={<Icon icon="tabler:upload" />} onClick={() => setImportOpen(true)}>
          Import from Excel
        </Button>
        <Box sx={{ rowGap: 2, columnGap: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {selection.length > 0 && (
            <Button
              color="error"
              variant="tonal"
              startIcon={<Icon icon="tabler:trash" />}
              onClick={() => setConfirmDelete({ ids: selection.map(String), label: `${selection.length} devices` })}
            >
              Delete {selection.length} selected
            </Button>
          )}
          <Button
            color="secondary"
            variant="tonal"
            startIcon={<Icon icon="tabler:download" />}
            onClick={() => api.exportDownload('devices').catch((e) => toast(e.message, 'error'))}
          >
            Export XLSX
          </Button>
          <CustomTextField
            value={search}
            placeholder="Search IP, hostname, region…"
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="contained" startIcon={<Icon icon="tabler:plus" />} onClick={() => setEditDevice('new')}>
            Add Device
          </Button>
        </Box>
      </Box>

      <DataGrid
        autoHeight
        rowHeight={62}
        rows={filtered}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={selection}
        onRowSelectionModelChange={setSelection}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: { sortModel: [{ field: 'Device', sort: 'asc' }] },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />

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
    </Card>
  )
}
