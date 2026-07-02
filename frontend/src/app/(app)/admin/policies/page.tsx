'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { LoadingRow } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

function NewRuleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [ruleType, setRuleType] = useState<'allow' | 'deny'>('allow')
  const [cidr, setCidr] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('100')

  const mut = useMutation({
    mutationFn: () => api.policies.createNetworkAcl({ rule_type: ruleType, cidr, description: description || undefined, priority: Number(priority) || 100 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-policies'] })
      toast('Rule created', 'success')
      onClose()
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to create rule', 'error'),
  })

  return (
    <Modal
      title="New IP Access Rule"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!cidr || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">Rule type</label>
          <select className="select" value={ruleType} onChange={(e) => setRuleType(e.target.value as 'allow' | 'deny')}>
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">CIDR *</label>
          <input className="input text-mono" value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="e.g. 203.0.113.0/24 or 2001:db8::/32" />
        </div>
        <div className="field">
          <label className="field-label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Corporate VPN" />
        </div>
        <div className="field">
          <label className="field-label">Priority (lower evaluates first)</label>
          <input className="input" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        <div className="banner banner-info">
          Adding any <strong>allow</strong> rule switches this organization into allowlist mode:
          traffic that matches no rule will be denied by default.
        </div>
      </div>
    </Modal>
  )
}

export default function PoliciesAdminPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showNew, setShowNew] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-policies'],
    queryFn: () => api.policies.listNetworkAcls(),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.policies.setEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-policies'] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to update rule', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.policies.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-policies'] }); toast('Rule deleted', 'success') },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to delete rule', 'error'),
  })

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const rules = [...(data?.rules ?? [])].sort((a, b) => a.priority - b.priority)

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="toolbar-left">
          <span className="text-dim text-sm">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Rule</button>
        </div>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title="No IP access rules"
          sub="With no rules, all IP addresses are allowed by default."
          action={<button className="btn btn-primary" onClick={() => setShowNew(true)}>New Rule</button>}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Type</th>
                  <th>CIDR</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="mono text-dim">{r.priority}</td>
                    <td>{r.rule_type === 'allow' ? <span className="badge badge-success">allow</span> : <span className="badge badge-error">deny</span>}</td>
                    <td className="mono">{r.cidr}</td>
                    <td className="text-dim">{r.description ?? '—'}</td>
                    <td>{r.enabled ? <span className="badge badge-info">enabled</span> : <span className="text-faint">disabled</span>}</td>
                    <td className="actions">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={toggleMut.isPending}
                          onClick={() => toggleMut.mutate({ id: r.id, enabled: !r.enabled })}
                        >
                          {r.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={deleteMut.isPending}
                          onClick={() => { if (confirm('Delete this rule?')) deleteMut.mutate(r.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewRuleModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
