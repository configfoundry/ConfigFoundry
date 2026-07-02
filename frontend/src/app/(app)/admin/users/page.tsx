'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { AppUser, Role } from '@/lib/types'
import { LoadingRow } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

function fmtTs(ts: number | null) {
  if (!ts) return '—'
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function NewUserModal({ onClose }: { onClose: () => void }) {
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
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create user', 'error'),
  })

  return (
    <Modal
      title="New User"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!email || !password || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">Email *</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Initial password *</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')

  const mut = useMutation({
    mutationFn: () => api.users.resetPassword(user.id, password),
    onSuccess: () => {
      toast(`Password reset for ${user.email}`, 'success')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to reset password', 'error'),
  })

  return (
    <Modal
      title={`Reset password — ${user.email}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!password || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Resetting…' : 'Reset password'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">New password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </Modal>
  )
}

function RolesModal({ user, roles, onClose }: { user: AppUser; roles: Role[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [pendingRoleId, setPendingRoleId] = useState('')

  const assignedIds = new Set((user.roles ?? []).map((r) => r.id))
  const available = roles.filter((r) => !assignedIds.has(r.id))

  const assignMut = useMutation({
    mutationFn: (roleId: string) => api.users.assignRole(user.id, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setPendingRoleId('')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to assign role', 'error'),
  })

  const unassignMut = useMutation({
    mutationFn: (roleId: string) => api.users.unassignRole(user.id, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to remove role', 'error'),
  })

  return (
    <Modal title={`Roles — ${user.email}`} onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(user.roles ?? []).length === 0 ? (
            <span className="text-faint text-sm">No roles assigned</span>
          ) : (
            (user.roles ?? []).map((r) => (
              <span key={r.id} className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.name}
                <button
                  className="btn-icon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                  disabled={unassignMut.isPending}
                  onClick={() => unassignMut.mutate(r.id)}
                  title="Remove role"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        {available.length > 0 && (
          <div className="field">
            <label className="field-label">Add role</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="select" value={pendingRoleId} onChange={(e) => setPendingRoleId(e.target.value)}>
                <option value="">Select a role…</option>
                {available.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!pendingRoleId || assignMut.isPending}
                onClick={() => assignMut.mutate(pendingRoleId)}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function UsersAdminPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { user: me } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
  const [rolesTarget, setRolesTarget] = useState<AppUser | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.users.list(),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.roles.list(),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.users.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast('User deactivated', 'success') },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to deactivate user', 'error'),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.users.reactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast('User reactivated', 'success') },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to reactivate user', 'error'),
  })

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const users = data?.users ?? []
  const roles = rolesData?.roles ?? []

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="toolbar-left">
          <span className="text-dim text-sm">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New User</button>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users yet" sub="Create the first user account." action={<button className="btn btn-primary" onClick={() => setShowNew(true)}>New User</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Full name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Last login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td className="text-dim">{u.full_name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(u.roles ?? []).length === 0 ? (
                          <span className="text-faint">—</span>
                        ) : (
                          (u.roles ?? []).map((r) => (
                            <span key={r.id} className="badge badge-neutral" style={{ fontSize: 11 }}>{r.name}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      {u.is_active ? <span className="badge badge-success">active</span> : <span className="badge badge-error">inactive</span>}
                    </td>
                    <td>{u.mfa_enabled ? <span className="badge badge-info">on</span> : <span className="text-faint">off</span>}</td>
                    <td className="text-dim text-sm">{fmtTs(u.last_login_at)}</td>
                    <td className="actions">
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setRolesTarget(u)}>Roles</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setResetTarget(u)}>Reset PW</button>
                        {u.is_active ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={u.id === me?.id || deactivateMut.isPending}
                            title={u.id === me?.id ? "You can't deactivate your own account" : undefined}
                            onClick={() => { if (confirm(`Deactivate ${u.email}?`)) deactivateMut.mutate(u.id) }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" disabled={reactivateMut.isPending} onClick={() => reactivateMut.mutate(u.id)}>
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewUserModal onClose={() => setShowNew(false)} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {rolesTarget && (
        <RolesModal
          user={users.find((u) => u.id === rolesTarget.id) ?? rolesTarget}
          roles={roles}
          onClose={() => setRolesTarget(null)}
        />
      )}
    </div>
  )
}
