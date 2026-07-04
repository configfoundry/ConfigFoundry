'use client'

/**
 * Users admin -- UI-only migration of the old admin/users/page.tsx. Same
 * query keys (['admin-users'], ['admin-roles']), same mutations
 * (users.create/deactivate/reactivate/assignRole/unassignRole/resetPassword),
 * same "can't deactivate your own account" guard via useAuth().
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Skeleton from '@mui/material/Skeleton'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { api, ApiError } from '@/lib/api'
import type { AppUser, Role } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { StatusChip } from '@/components/common/StatusChip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

function fmtTs(ts: number | null) {
  if (!ts) return '—'
  try {
    return new Date(ts * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function NewUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')

  const mut = useMutation({
    mutationFn: () => api.users.create(email, password, fullName || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast('User created', 'success')
      setEmail('')
      setFullName('')
      setPassword('')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create user', 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New User</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField label="Email" required size="small" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Full name" size="small" fullWidth value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="Initial password" required type="password" size="small" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!email || !password || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')

  const mut = useMutation({
    mutationFn: () => api.users.resetPassword(user!.id, password),
    onSuccess: () => {
      toast(`Password reset for ${user!.email}`, 'success')
      setPassword('')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to reset password', 'error'),
  })

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset password{user ? ` — ${user.email}` : ''}</DialogTitle>
      <DialogContent>
        <TextField
          label="New password"
          type="password"
          size="small"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mt: 0.5 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!password || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RolesDialog({ user, roles, onClose }: { user: AppUser | null; roles: Role[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [pendingRole, setPendingRole] = useState<Role | null>(null)

  const assignedIds = new Set((user?.roles ?? []).map((r) => r.id))
  const available = roles.filter((r) => !assignedIds.has(r.id))

  const assignMut = useMutation({
    mutationFn: (roleId: string) => api.users.assignRole(user!.id, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setPendingRole(null)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to assign role', 'error'),
  })

  const unassignMut = useMutation({
    mutationFn: (roleId: string) => api.users.unassignRole(user!.id, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to remove role', 'error'),
  })

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Roles{user ? ` — ${user.email}` : ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {(user?.roles ?? []).length === 0 ? (
              <Box component="span" sx={{ color: 'text.disabled', fontSize: 13 }}>
                No roles assigned
              </Box>
            ) : (
              (user?.roles ?? []).map((r) => (
                <Chip key={r.id} label={r.name} size="small" onDelete={() => unassignMut.mutate(r.id)} disabled={unassignMut.isPending} />
              ))
            )}
          </Stack>
          {available.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Autocomplete
                size="small"
                fullWidth
                options={available}
                getOptionLabel={(r) => r.name}
                value={pendingRole}
                onChange={(_e, v) => setPendingRole(v)}
                renderInput={(params) => <TextField {...params} label="Add role" />}
              />
              <Button variant="outlined" disabled={!pendingRole || assignMut.isPending} onClick={() => pendingRole && assignMut.mutate(pendingRole.id)}>
                Add
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export function UsersView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
  const [rolesTarget, setRolesTarget] = useState<AppUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.users.list() })
  const { data: rolesData } = useQuery({ queryKey: ['admin-roles'], queryFn: () => api.roles.list() })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.users.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast('User deactivated', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to deactivate user', 'error'),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.users.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast('User reactivated', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to reactivate user', 'error'),
  })

  const users = data?.users ?? []
  const roles = rolesData?.roles ?? []
  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    if (!q) return true
    return u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)
  })

  const columns: GridColDef<AppUser>[] = [
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 180 },
    { field: 'full_name', headerName: 'Full name', flex: 1, minWidth: 140, valueGetter: (p) => p.row.full_name ?? '—' },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1.2,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ py: 0.5 }}>
          {(row.roles ?? []).length === 0 ? '—' : (row.roles ?? []).map((r) => <Chip key={r.id} label={r.name} size="small" />)}
        </Stack>
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => <StatusChip label={value ? 'active' : 'inactive'} tone={value ? 'success' : 'error'} />,
    },
    {
      field: 'mfa_enabled',
      headerName: 'MFA',
      width: 90,
      renderCell: ({ value }) => (value ? <StatusChip label="on" tone="info" /> : <Box sx={{ color: 'text.disabled', fontSize: 13 }}>off</Box>),
    },
    { field: 'last_login_at', headerName: 'Last login', flex: 1, minWidth: 160, valueGetter: (p) => fmtTs(p.row.last_login_at) },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 130,
      getActions: ({ row }) => [
        <GridActionsCellItem key="roles" icon={<GroupOutlinedIcon fontSize="small" />} label="Roles" onClick={() => setRolesTarget(row)} />,
        <GridActionsCellItem key="reset" icon={<LockResetOutlinedIcon fontSize="small" />} label="Reset PW" onClick={() => setResetTarget(row)} />,
        row.is_active ? (
          <GridActionsCellItem
            key="deactivate"
            icon={<BlockOutlinedIcon fontSize="small" />}
            label="Deactivate"
            disabled={row.id === me?.id}
            onClick={() => setDeactivateTarget(row)}
          />
        ) : (
          <GridActionsCellItem key="reactivate" icon={<CheckCircleOutlinedIcon fontSize="small" />} label="Reactivate" onClick={() => reactivateMut.mutate(row.id)} />
        ),
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
      <Box sx={{ height: 560, width: '100%' }}>
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
              searchPlaceholder: 'Search email, name…',
              rightActions: (
                <Button size="small" variant="contained" startIcon={<PersonAddOutlinedIcon />} onClick={() => setShowNew(true)}>
                  New User
                </Button>
              ),
            },
          }}
        />
      </Box>

      <NewUserDialog open={showNew} onClose={() => setShowNew(false)} />
      <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      <RolesDialog user={rolesTarget ? (users.find((u) => u.id === rolesTarget.id) ?? rolesTarget) : null} roles={roles} onClose={() => setRolesTarget(null)} />
      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate user"
        message={deactivateTarget ? `Deactivate ${deactivateTarget.email}?` : ''}
        confirmLabel="Deactivate"
        onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
        onClose={() => setDeactivateTarget(null)}
      />
    </Box>
  )
}
