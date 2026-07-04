'use client'

/**
 * API Keys admin -- UI-only migration of the old admin/api-keys/page.tsx.
 * Same query keys, same mutations (apiKeys.create/revoke), same
 * "show the raw key exactly once" flow.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { api, ApiError } from '@/lib/api'
import type { ApiKeyIssued, ApiKeySummary, Permission } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { StatusChip } from '@/components/common/StatusChip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionTree } from '@/components/common/PermissionTree'

function fmtTs(ts: number | null) {
  if (!ts) return 'Never'
  try {
    return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function NewKeyDialog({
  open,
  permissions,
  onClose,
  onIssued,
}: {
  open: boolean
  permissions: Permission[]
  onClose: () => void
  onIssued: (k: ApiKeyIssued) => void
}) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState('production')
  const [allowedIpsText, setAllowedIpsText] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
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
    mutationFn: () => {
      const allowed_ips = allowedIpsText.split('\n').map((s) => s.trim()).filter(Boolean)
      const expires_at = expiresInDays ? Math.floor(Date.now() / 1000) + Number(expiresInDays) * 86400 : null
      return api.apiKeys.create({
        name,
        permissions: Array.from(selected),
        allowed_ips: allowed_ips.length ? allowed_ips : undefined,
        environment,
        expires_at,
      })
    },
    onSuccess: (issued) => {
      qc.invalidateQueries({ queryKey: ['admin-api-keys'] })
      toast('API key created', 'success')
      setName('')
      setAllowedIpsText('')
      setExpiresInDays('')
      setSelected(new Set())
      onIssued(issued)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create API key', 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New API Key</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField label="Name" required size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monitoring integration" />
          <TextField select label="Environment" size="small" fullWidth value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <MenuItem value="production">Production</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="development">Development</MenuItem>
          </TextField>
          <TextField
            label="Allowed IPs / CIDRs (one per line, optional)"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={allowedIpsText}
            onChange={(e) => setAllowedIpsText(e.target.value)}
            placeholder={'203.0.113.4\n198.51.100.0/24'}
          />
          <TextField
            label="Expires in (days, blank = never)"
            type="number"
            size="small"
            fullWidth
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />
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
        <Button variant="contained" disabled={!name || selected.size === 0 || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function IssuedKeyDialog({ issued, onClose }: { issued: ApiKeyIssued | null; onClose: () => void }) {
  const { toast } = useToast()
  if (!issued) return null
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API key created</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Copy this key now — it will not be shown again.
        </Alert>
        <TextField
          label={issued.name}
          fullWidth
          size="small"
          value={issued.api_key}
          InputProps={{
            readOnly: true,
            sx: { fontFamily: 'monospace' },
            endAdornment: (
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard?.writeText(issued.api_key)
                  toast('Copied to clipboard', 'success')
                }}
              >
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            ),
          }}
          onClick={(e) => (e.target as HTMLInputElement).select?.()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ApiKeysView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [issued, setIssued] = useState<ApiKeyIssued | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-api-keys'], queryFn: () => api.apiKeys.list() })
  const { data: permsData } = useQuery({ queryKey: ['admin-permissions'], queryFn: () => api.roles.permissions() })

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.apiKeys.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-api-keys'] })
      toast('API key revoked', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to revoke key', 'error'),
  })

  const keys = data?.api_keys ?? []
  const permissions = permsData?.permissions ?? []
  const filtered = keys.filter((k) => !search || k.name.toLowerCase().includes(search.toLowerCase()))

  const columns: GridColDef<ApiKeySummary>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'key_prefix', headerName: 'Prefix', width: 130, valueGetter: (p) => `${p.row.key_prefix}…` },
    { field: 'environment', headerName: 'Environment', width: 120 },
    { field: 'permissions', headerName: 'Permissions', width: 120, valueGetter: (p) => p.row.permissions.length, renderCell: ({ value }) => `${value} granted` },
    { field: 'expires_at', headerName: 'Expires', width: 130, valueGetter: (p) => fmtTs(p.row.expires_at) },
    {
      field: 'enabled',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => <StatusChip label={value ? 'enabled' : 'revoked'} tone={value ? 'success' : 'error'} />,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 70,
      getActions: ({ row }) =>
        row.enabled
          ? [<GridActionsCellItem key="revoke" icon={<DeleteOutlineOutlinedIcon fontSize="small" />} label="Revoke" onClick={() => setRevokeTarget(row)} />]
          : [],
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
              searchPlaceholder: 'Search API keys…',
              rightActions: (
                <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowNew(true)}>
                  New API Key
                </Button>
              ),
            },
          }}
        />
      </Box>

      <NewKeyDialog
        open={showNew}
        permissions={permissions}
        onClose={() => setShowNew(false)}
        onIssued={(k) => {
          setShowNew(false)
          setIssued(k)
        }}
      />
      <IssuedKeyDialog issued={issued} onClose={() => setIssued(null)} />
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke API key"
        message={revokeTarget ? `Revoke API key "${revokeTarget.name}"?` : ''}
        onConfirm={() => revokeTarget && revokeMut.mutate(revokeTarget.id)}
        onClose={() => setRevokeTarget(null)}
      />
    </Box>
  )
}
