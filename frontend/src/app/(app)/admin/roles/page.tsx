'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { Permission, Role } from '@/lib/types'
import { LoadingRow } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

function groupByCategory(perms: Permission[]): Record<string, Permission[]> {
  const out: Record<string, Permission[]> = {}
  for (const p of perms) {
    const cat = p.category ?? 'Other'
    ;(out[cat] ??= []).push(p)
  }
  return out
}

function PermissionPicker({
  permissions,
  selected,
  onToggle,
}: {
  permissions: Permission[]
  selected: Set<string>
  onToggle: (code: string) => void
}) {
  const groups = groupByCategory(permissions)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 360, overflowY: 'auto' }}>
      {Object.entries(groups).map(([cat, perms]) => (
        <div key={cat}>
          <div className="field-label" style={{ marginBottom: 6 }}>{cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {perms.map((p) => (
              <label key={p.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3, width: 13, height: 13 }}
                  checked={selected.has(p.code)}
                  onChange={() => onToggle(p.code)}
                />
                <span>
                  <span className="text-mono">{p.code}</span>
                  {p.description && <div className="text-faint text-sm">{p.description}</div>}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function NewRoleModal({ permissions, onClose }: { permissions: Permission[]; onClose: () => void }) {
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
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create role', 'error'),
  })

  return (
    <Modal
      title="New Role"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Network Engineer" />
        </div>
        <div className="field">
          <label className="field-label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Permissions</label>
          <PermissionPicker permissions={permissions} selected={selected} onToggle={toggle} />
        </div>
      </div>
    </Modal>
  )
}

function EditPermissionsModal({ role, permissions, onClose }: { role: Role; permissions: Permission[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions))

  function toggle(code: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const mut = useMutation({
    mutationFn: () => api.roles.updatePermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      toast('Permissions updated', 'success')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to update permissions', 'error'),
  })

  return (
    <Modal
      title={`Edit permissions — ${role.name}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <PermissionPicker permissions={permissions} selected={selected} onToggle={toggle} />
    </Modal>
  )
}

export default function RolesAdminPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showNew, setShowNew] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.roles.list(),
  })

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.roles.permissions(),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.roles.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast('Role deleted', 'success') },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to delete role', 'error'),
  })

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const roles = data?.roles ?? []
  const permissions = permsData?.permissions ?? []

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="toolbar-left">
          <span className="text-dim text-sm">{roles.length} role{roles.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Role</button>
        </div>
      </div>

      {roles.length === 0 ? (
        <EmptyState title="No custom roles" sub="System roles are seeded automatically; add a custom role here." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="text-dim">{r.description ?? '—'}</td>
                    <td className="text-dim text-sm">{r.permissions.length} granted</td>
                    <td>{r.is_system ? <span className="badge badge-neutral">system</span> : <span className="badge badge-info">custom</span>}</td>
                    <td className="actions">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={r.name === 'Super Admin'}
                          title={r.name === 'Super Admin' ? 'Super Admin always has every permission' : undefined}
                          onClick={() => setEditTarget(r)}
                        >
                          Edit permissions
                        </button>
                        {!r.is_system && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={deleteMut.isPending}
                            onClick={() => { if (confirm(`Delete role "${r.name}"?`)) deleteMut.mutate(r.id) }}
                          >
                            Delete
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

      {showNew && <NewRoleModal permissions={permissions} onClose={() => setShowNew(false)} />}
      {editTarget && <EditPermissionsModal role={editTarget} permissions={permissions} onClose={() => setEditTarget(null)} />}
    </div>
  )
}
