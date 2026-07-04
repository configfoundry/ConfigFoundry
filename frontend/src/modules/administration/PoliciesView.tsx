'use client'

/**
 * IP Policies admin -- UI-only migration of the old admin/policies/page.tsx.
 * Same query key (['admin-policies']), same mutations
 * (policies.createNetworkAcl/setEnabled/delete), same priority sort.
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
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import { api, ApiError } from '@/lib/api'
import type { NetworkACLRule } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { DataGridToolbar } from '@/components/tables/DataGridToolbar'
import { StatusChip } from '@/components/common/StatusChip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

function NewRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [ruleType, setRuleType] = useState<'allow' | 'deny'>('allow')
  const [cidr, setCidr] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('100')

  const mut = useMutation({
    mutationFn: () =>
      api.policies.createNetworkAcl({ rule_type: ruleType, cidr, description: description || undefined, priority: Number(priority) || 100 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-policies'] })
      toast('Rule created', 'success')
      setCidr('')
      setDescription('')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create rule', 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New IP Access Rule</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField select label="Rule type" size="small" fullWidth value={ruleType} onChange={(e) => setRuleType(e.target.value as 'allow' | 'deny')}>
            <MenuItem value="allow">Allow</MenuItem>
            <MenuItem value="deny">Deny</MenuItem>
          </TextField>
          <TextField
            label="CIDR"
            required
            size="small"
            fullWidth
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            placeholder="e.g. 203.0.113.0/24 or 2001:db8::/32"
            InputProps={{ sx: { fontFamily: 'monospace' } }}
          />
          <TextField label="Description" size="small" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Corporate VPN" />
          <TextField label="Priority (lower evaluates first)" type="number" size="small" fullWidth value={priority} onChange={(e) => setPriority(e.target.value)} />
          <Alert severity="info">
            Adding any <strong>allow</strong> rule switches this organization into allowlist mode: traffic that matches no rule will be denied by
            default.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!cidr || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function PoliciesView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NetworkACLRule | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-policies'], queryFn: () => api.policies.listNetworkAcls() })

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.policies.setEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-policies'] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to update rule', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.policies.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-policies'] })
      toast('Rule deleted', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to delete rule', 'error'),
  })

  const rules = [...(data?.rules ?? [])].sort((a, b) => a.priority - b.priority)
  const filtered = rules.filter((r) => !search || r.cidr.toLowerCase().includes(search.toLowerCase()) || (r.description ?? '').toLowerCase().includes(search.toLowerCase()))

  const columns: GridColDef<NetworkACLRule>[] = [
    { field: 'priority', headerName: 'Priority', width: 100 },
    {
      field: 'rule_type',
      headerName: 'Type',
      width: 100,
      renderCell: ({ value }) => <StatusChip label={value} tone={value === 'allow' ? 'success' : 'error'} />,
    },
    { field: 'cidr', headerName: 'CIDR', flex: 1, minWidth: 160 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 160, valueGetter: (p) => p.row.description ?? '—' },
    {
      field: 'enabled',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => (value ? <StatusChip label="enabled" tone="info" /> : <Box sx={{ color: 'text.disabled', fontSize: 13 }}>disabled</Box>),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="toggle"
          icon={row.enabled ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />}
          label={row.enabled ? 'Disable' : 'Enable'}
          onClick={() => toggleMut.mutate({ id: row.id, enabled: !row.enabled })}
        />,
        <GridActionsCellItem key="delete" icon={<DeleteOutlineOutlinedIcon fontSize="small" />} label="Delete" onClick={() => setDeleteTarget(row)} />,
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
          getRowId={(r) => r.id}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'priority', sort: 'asc' }] } }}
          pageSizeOptions={[10, 25, 50]}
          slots={{ toolbar: DataGridToolbar }}
          slotProps={{
            toolbar: {
              searchValue: search,
              onSearchChange: setSearch,
              searchPlaceholder: 'Search CIDR, description…',
              rightActions: (
                <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowNew(true)}>
                  New Rule
                </Button>
              ),
            },
          }}
        />
      </Box>

      <NewRuleDialog open={showNew} onClose={() => setShowNew(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete rule"
        message="Delete this rule?"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
