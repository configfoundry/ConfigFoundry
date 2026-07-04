'use client'

/**
 * Roles admin -- UI-only migration of the old admin/roles/page.tsx. Same
 * query keys (['admin-roles'], ['admin-permissions']), same mutations
 * (roles.create/updatePermissions/delete), same "Super Admin can't be
 * edited" and "system roles can't be deleted" guards.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import AddModeratorOutlinedIcon from '@mui/icons-material/AddModeratorOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { api, ApiError } from '@/lib/api'
import type { Permission, Role } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { StatusChip } from '@/components/common/StatusChip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionTree } from '@/components/common/PermissionTree'

function NewRoleDialog({ open, permissions, onClose }: { open: boolean; permissions: Permission[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(code: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const mut = useMutation({
    mutationFn: () => api.roles.create(name, description, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast('Role created', 'success')
      setName('')
      setDescription('')
      setSelected(new Set())
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create role', 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Role</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField label="Name" required size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Network Engineer" />
          <TextField label="Description" size="small" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          <Box>
            <Box sx={{ mb: 1, fontSize: 13, fontWeight: 600 }}>Permissions</Box>
            <PermissionTree permissions={permissions} selected={selected} onToggle={toggle} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!name || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function EditPermissionsDialog({ role, permissions, onClose }: { role: Role | null; permissions: Permission[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []))

  function toggle(code: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const mut = useMutation({
    mutationFn: () => api.roles.updatePermissions(role!.id, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast('Permissions updated', 'success')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to update permissions', 'error'),
  })

  return (
    <Dialog
      open={!!role}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: () => setSelected(new Set(role?.permissions ?? [])) }}
    >
      <DialogTitle>Edit permissions{role ? ` — ${role.name}` : ''}</DialogTitle>
      <DialogContent>
        <PermissionTree permissions={permissions} selected={selected} onToggle={toggle} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function RolesView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-roles'], queryFn: () => api.roles.list() })
  const { data: permsData } = useQuery({ queryKey: ['admin-permissions'], queryFn: () => api.roles.permissions() })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.roles.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast('Role deleted', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to delete role', 'error'),
  })

  const roles = data?.roles ?? []
  const permissions = permsData?.permissions ?? []
  const filtered = roles.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))

  const columns: GridColDef<Role>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'description', headerName: 'Description', flex: 1.3, minWidth: 180, valueGetter: (p) => p.row.description ?? '—' },
    { field: 'permissions', headerName: 'Permissions', width: 130, valueGetter: (p) => p.row.permissions.length, renderCell: ({ value }) => `${value} granted` },
    {
      field: 'is_system',
      headerName: 'Type',
      width: 110,
      renderCell: ({ value }) => <StatusChip label={value ? 'system' : 'custom'} tone={value ? 'neutral' : 'info'} />,
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
          label="Edit permissions"
          disabled={row.name === 'Super Admin'}
          onClick={() => setEditTarget(row)}
        />,
        ...(row.is_system
          ? []
          : [
              <GridActionsCellItem
                key="delete"
                icon={<DeleteOutlineOutlinedIcon fontSize="small" />}
                label="Delete"
                onClick={() => setDeleteTarget(row)}
              />,
            ]),
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

  return (
    <Box>
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[10, 25, 50]}
          slots={{ toolbar: DataGridToolbar }}
          slotProps={{
            toolbar: {
              searchValue: search,
              onSearchChange: setSearch,
              searchPlaceholder: 'Search roles…',
              rightActions: (
                <Button size="small" variant="contained" startIcon={<AddModeratorOutlinedIcon />} onClick={() => setShowNew(true)}>
                  New Role
                </Button>
              ),
            },
          }}
        />
      </Box>

      <NewRoleDialog open={showNew} permissions={permissions} onClose={() => setShowNew(false)} />
      <EditPermissionsDialog role={editTarget} permissions={permissions} onClose={() => setEditTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete role"
        message={deleteTarget ? `Delete role "${deleteTarget.name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
