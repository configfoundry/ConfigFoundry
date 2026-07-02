'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { ApiKeyIssued, Permission } from '@/lib/types'
import { LoadingRow } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

function fmtTs(ts: number | null) {
  if (!ts) return 'Never'
  try {
    return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function NewKeyModal({ permissions, onClose, onIssued }: { permissions: Permission[]; onClose: () => void; onIssued: (k: ApiKeyIssued) => void }) {
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
      const expires_at = expiresInDays
        ? Math.floor(Date.now() / 1000) + Number(expiresInDays) * 86400
        : null
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
      onIssued(issued)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create API key', 'error'),
  })

  return (
    <Modal
      title="New API Key"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name || selected.size === 0 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monitoring integration" />
        </div>
        <div className="field">
          <label className="field-label">Environment</label>
          <select className="select" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Allowed IPs / CIDRs (one per line, optional)</label>
          <textarea className="input" rows={3} value={allowedIpsText} onChange={(e) => setAllowedIpsText(e.target.value)} placeholder={'203.0.113.4\n198.51.100.0/24'} />
        </div>
        <div className="field">
          <label className="field-label">Expires in (days, blank = never)</label>
          <input className="input" type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Permissions *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {permissions.map((p) => (
              <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" style={{ width: 13, height: 13 }} checked={selected.has(p.code)} onChange={() => toggle(p.code)} />
                <span className="text-mono">{p.code}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function IssuedKeyModal({ issued, onClose }: { issued: ApiKeyIssued; onClose: () => void }) {
  const { toast } = useToast()
  return (
    <Modal title="API key created" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <div className="banner banner-warn" style={{ marginBottom: 12 }}>
        Copy this key now — it will not be shown again.
      </div>
      <div className="field">
        <label className="field-label">{issued.name}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input text-mono" readOnly value={issued.api_key} onClick={(e) => e.currentTarget.select()} />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(issued.api_key)
              toast('Copied to clipboard', 'success')
            }}
          >
            Copy
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ApiKeysAdminPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showNew, setShowNew] = useState(false)
  const [issued, setIssued] = useState<ApiKeyIssued | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: () => api.apiKeys.list(),
  })

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.roles.permissions(),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.apiKeys.revoke(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-api-keys'] }); toast('API key revoked', 'success') },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to revoke key', 'error'),
  })

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const keys = data?.api_keys ?? []
  const permissions = permsData?.permissions ?? []

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="toolbar-left">
          <span className="text-dim text-sm">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New API Key</button>
        </div>
      </div>

      {keys.length === 0 ? (
        <EmptyState title="No API keys" sub="Issue a key to let external systems call the API." action={<button className="btn btn-primary" onClick={() => setShowNew(true)}>New API Key</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Environment</th>
                  <th>Permissions</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td className="mono text-dim">{k.key_prefix}…</td>
                    <td className="text-dim">{k.environment}</td>
                    <td className="text-dim text-sm">{k.permissions.length} granted</td>
                    <td className="text-dim text-sm">{fmtTs(k.expires_at)}</td>
                    <td>{k.enabled ? <span className="badge badge-success">enabled</span> : <span className="badge badge-error">revoked</span>}</td>
                    <td className="actions">
                      {k.enabled && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={revokeMut.isPending}
                          onClick={() => { if (confirm(`Revoke API key "${k.name}"?`)) revokeMut.mutate(k.id) }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <NewKeyModal
          permissions={permissions}
          onClose={() => setShowNew(false)}
          onIssued={(k) => { setShowNew(false); setIssued(k) }}
        />
      )}
      {issued && <IssuedKeyModal issued={issued} onClose={() => setIssued(null)} />}
    </div>
  )
}
