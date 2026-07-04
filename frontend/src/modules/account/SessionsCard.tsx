'use client'

// MUI rewrite of the old app/(app)/settings/page.tsx SessionsCard -- same
// api.auth.listSessions/revokeSession calls, new look and new home
// (Account > Sessions).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { api, ApiError } from '@/lib/api'
import type { SessionInfo } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/components/ui/Toast'

function fmtEpochSeconds(ts: number) {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return String(ts)
  }
}

export function SessionsCard() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: () => api.auth.listSessions(),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.auth.revokeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-sessions'] })
      toast('Session revoked', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to revoke session', 'error'),
  })

  const sessions: SessionInfo[] = data?.sessions ?? []

  return (
    <Card>
      <CardHeader title="Active sessions" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
      <Divider />
      {isLoading ? (
        <Skeleton variant="rounded" height={160} sx={{ m: 4 }} />
      ) : error ? (
        <Alert severity="error" sx={{ m: 4 }} action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
          {(error as Error).message}
        </Alert>
      ) : sessions.length === 0 ? (
        <EmptyState title="No active sessions" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Issued</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>User Agent</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{fmtEpochSeconds(s.issued_at)}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{fmtEpochSeconds(s.expires_at)}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{s.source_ip ?? '—'}</TableCell>
                <TableCell>
                  <Typography noWrap variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                    {s.user_agent ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Button size="small" disabled={revokeMut.isPending} onClick={() => revokeMut.mutate(s.id)}>
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
