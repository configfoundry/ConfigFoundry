'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { SessionInfo, TagDef } from '@/lib/types'
import { LoadingRow } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

// ---------------------------------------------------------------------------
// Tag modal
// ---------------------------------------------------------------------------
const SCOPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'devices', label: 'Devices' },
  { key: 'bandwidth', label: 'Bandwidth Capping' },
  { key: 'subnets', label: 'Subnets' },
]

function TagModal({
  tag,
  onClose,
  onSave,
}: {
  tag: Partial<TagDef> | null
  onClose: () => void
  onSave: (t: Partial<TagDef>) => void
}) {
  const isNew = !tag?.id
  const [form, setForm] = useState({
    id: tag?.id ?? '',
    name: tag?.name ?? '',
    label: tag?.label ?? '',
    type: (tag?.type ?? 'enum') as TagDef['type'],
    required: tag?.required ?? false,
    scopes: tag?.scopes ?? [] as string[],
    valuesText: (tag?.values ?? []).join('\n'),
  })

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })) }

  function toggleScope(key: string) {
    setForm((f) => {
      const has = f.scopes.includes(key)
      return { ...f, scopes: has ? f.scopes.filter((s) => s !== key) : [...f.scopes, key] }
    })
  }

  function save() {
    const values = form.valuesText.split('\n').map((v) => v.trim()).filter(Boolean)
    const out: Partial<TagDef> = {
      name: form.name || form.id,
      label: form.label || form.name || form.id,
      type: form.type,
      required: form.required,
      scopes: form.scopes,
    }
    if (form.id) out.id = form.id
    if (form.type === 'enum') out.values = values
    onSave(out)
  }

  return (
    <Modal
      title={isNew ? 'New Tag' : 'Edit Tag'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.name && !form.id}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <div className="form-row" style={{ gap: 14 }}>
        <div className="field">
          <label className="field-label">Tag name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Country, Environment, Business Unit"
            disabled={!isNew}
          />
        </div>
        {/* Scopes — matches vanilla JS "Applies to" section */}
        <div className="field">
          <label className="field-label">Applies to</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {SCOPE_OPTIONS.map(({ key, label }) => (
              <label
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 'var(--radius)',
                  border: `1px solid ${form.scopes.includes(key) ? 'var(--primary)' : 'var(--border)'}`,
                  background: form.scopes.includes(key) ? 'var(--primary-subtle)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.scopes.includes(key)}
                  onChange={() => toggleScope(key)}
                  style={{ width: 13, height: 13 }}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="text-faint text-sm" style={{ marginTop: 4 }}>
            A tag applying to multiple sections shares the same value list.
          </div>
        </div>
        <div className="field">
          <label className="field-label">Type</label>
          <select className="select" value={form.type} onChange={(e) => set('type', e.target.value as TagDef['type'])}>
            <option value="enum">Enum (dropdown)</option>
            <option value="text">Text</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>
        <div className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            id="required-check"
            type="checkbox"
            checked={form.required}
            onChange={(e) => set('required', e.target.checked)}
            style={{ width: 14, height: 14 }}
          />
          <label htmlFor="required-check" className="field-label" style={{ cursor: 'pointer' }}>
            Required field
          </label>
        </div>
        {form.type === 'enum' && (
          <div className="field">
            <label className="field-label">Values (one per line)</label>
            <textarea
              className="input"
              rows={5}
              value={form.valuesText}
              onChange={(e) => set('valuesText', e.target.value)}
              placeholder={'APAC\nEMEA\nNAM\nLATAM'}
            />
            <div className="text-faint text-sm" style={{ marginTop: 4 }}>
              You can also manage values on the Managed Lists page after saving.
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Tags section
// ---------------------------------------------------------------------------
function TagsSection() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editTag, setEditTag] = useState<Partial<TagDef> | null | 'new'>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
  })

  const saveMut = useMutation({
    mutationFn: (t: Partial<TagDef>) => api.upsertTag(t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setEditTag(null)
      toast('Tag saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) => api.deleteTag(id, undefined, force),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast('Tag deleted', 'success') },
    onError: (e) => {
      const err = e as Error & { data?: { dependents?: string[] } }
      if (err.message.includes('in use')) {
        if (confirm('This tag is in use by devices. Delete anyway and remove it from all devices?')) {
          // Re-trigger with force=true — but we need the ID. This is a UX edge case.
          toast('Use the delete button again with force enabled.', 'warn')
        }
      } else {
        toast(err.message, 'error')
      }
    },
  })

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const tags = data?.tagDefs ?? []

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="toolbar-left">
          <span className="text-dim text-sm">{tags.length} tag definition{tags.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setEditTag('new')}>
            + Add Tag
          </button>
        </div>
      </div>

      {tags.length === 0 ? (
        <EmptyState
          title="No tags defined"
          sub="Tags let you add custom fields to devices (e.g. Collector Region, Role)."
          action={<button className="btn btn-primary" onClick={() => setEditTag('new')}>Add Tag</button>}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Applies to</th>
                  <th>Values</th>
                  <th>Required</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div>{t.label ?? t.name}</div>
                      <div className="text-faint text-sm mono">{t.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{t.type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(t.scopes ?? []).length === 0 ? (
                          <span className="text-faint">—</span>
                        ) : (
                          (t.scopes ?? []).map((s) => (
                            <span key={s} className="badge badge-info" style={{ fontSize: 11 }}>
                              {SCOPE_OPTIONS.find((o) => o.key === s)?.label ?? s}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="text-dim" style={{ maxWidth: 200 }}>
                      {t.type === 'enum'
                        ? (t.values ?? []).slice(0, 4).join(', ') +
                          ((t.values?.length ?? 0) > 4 ? ` +${(t.values?.length ?? 0) - 4}` : '')
                        : '—'}
                    </td>
                    <td>
                      {t.required ? (
                        <span className="badge badge-error">yes</span>
                      ) : (
                        <span className="text-faint">no</span>
                      )}
                    </td>
                    <td className="actions">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setEditTag(t)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete tag "${t.id}"?`))
                              deleteMut.mutate({ id: t.id, force: false })
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
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

      {editTag !== null && (
        <TagModal
          tag={typeof editTag === 'string' ? null : editTag}
          onClose={() => setEditTag(null)}
          onSave={(t) => saveMut.mutate(t)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Lists section
// ---------------------------------------------------------------------------
function ListsSection() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editList, setEditList] = useState<string | null>(null)
  const [itemsText, setItemsText] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.getLists(),
  })

  const saveMut = useMutation({
    mutationFn: ({ name, items }: { name: string; items: string[] }) =>
      api.setList(name, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] })
      setEditList(null)
      toast('List saved', 'success')
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const startEdit = useCallback(
    (name: string, items: string[]) => {
      setEditList(name)
      setItemsText(items.join('\n'))
    },
    [],
  )

  function saveList() {
    if (!editList) return
    const items = itemsText.split('\n').map((s) => s.trim()).filter(Boolean)
    saveMut.mutate({ name: editList, items })
  }

  if (isLoading) return <LoadingRow />
  if (error) return <ErrorBanner error={error as Error} onRetry={refetch} />

  const lists = Object.entries(data?.lists ?? {})

  return (
    <>
      {lists.length === 0 ? (
        <EmptyState title="No managed lists" sub="Lists like Collector Regions will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lists.map(([name, items]) => (
            <div key={name} className="card">
              <div className="card-header">
                <h3 style={{ textTransform: 'capitalize' }}>{name.replace(/_/g, ' ')}</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(name, items)}
                >
                  Edit
                </button>
              </div>
              <div className="card-body">
                {items.length === 0 ? (
                  <span className="text-faint text-sm">No items</span>
                ) : (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {items.map((item) => (
                      <span key={item} className="badge badge-neutral">{item}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editList && (
        <Modal
          title={`Edit List: ${editList.replace(/_/g, ' ')}`}
          onClose={() => setEditList(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditList(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveList}>Save</button>
            </>
          }
        >
          <div className="field">
            <label className="field-label">Items (one per line)</label>
            <textarea
              className="input"
              rows={10}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder={'APAC\nEMEA\nNAM'}
            />
          </div>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Security tab: change password, MFA enrollment, active sessions
// ---------------------------------------------------------------------------
function ChangePasswordCard() {
  const { toast } = useToast()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const mut = useMutation({
    mutationFn: () => api.auth.changePassword(oldPw, newPw),
    onSuccess: () => {
      toast('Password changed', 'success')
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to change password', 'error'),
  })

  const mismatch = newPw.length > 0 && confirmPw.length > 0 && newPw !== confirmPw

  return (
    <div className="card">
      <div className="card-header">
        <strong>Change password</strong>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
          <div className="field">
            <label className="field-label">Current password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">New password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Confirm new password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
            {mismatch && <span className="text-faint text-sm" style={{ color: 'var(--danger)' }}>Passwords do not match</span>}
          </div>
          <div>
            <button
              className="btn btn-primary btn-sm"
              disabled={!oldPw || !newPw || mismatch || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MfaCard() {
  const { toast } = useToast()
  const { user, refreshUser } = useAuth()
  const [enrolling, setEnrolling] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const beginMut = useMutation({
    mutationFn: () => api.auth.mfaEnrollBegin(),
    onSuccess: (r) => {
      setSecret(r.secret)
      setProvisioningUri(r.provisioning_uri)
      setEnrolling(true)
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to start MFA enrollment', 'error'),
  })

  const confirmMut = useMutation({
    mutationFn: () => api.auth.mfaEnrollConfirm(secret!, code.trim()),
    onSuccess: (r) => {
      setBackupCodes(r.backup_codes)
      setEnrolling(false)
      setCode('')
      refreshUser()
      toast('MFA enabled', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Invalid code', 'error'),
  })

  const disableMut = useMutation({
    mutationFn: () => api.auth.mfaDisable(),
    onSuccess: () => {
      refreshUser()
      toast('MFA disabled', 'success')
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Failed to disable MFA', 'error'),
  })

  return (
    <div className="card">
      <div className="card-header">
        <strong>Two-factor authentication</strong>
        {user?.mfa_enabled ? (
          <span className="badge badge-success">Enabled</span>
        ) : (
          <span className="badge badge-neutral">Disabled</span>
        )}
      </div>
      <div className="card-body">
        {backupCodes ? (
          <div>
            <div className="banner banner-warn" style={{ marginBottom: 12 }}>
              Save these backup codes now — each can be used once if you lose access to your
              authenticator app. They will not be shown again.
            </div>
            <div
              className="text-mono"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                marginBottom: 12,
              }}
            >
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setBackupCodes(null)}>
              Done
            </button>
          </div>
        ) : user?.mfa_enabled ? (
          <div>
            <p className="text-dim text-sm" style={{ marginTop: 0 }}>
              Two-factor authentication is protecting this account.
            </p>
            <button
              className="btn btn-danger btn-sm"
              disabled={disableMut.isPending}
              onClick={() => {
                if (confirm('Disable two-factor authentication for your account?')) disableMut.mutate()
              }}
            >
              {disableMut.isPending ? 'Disabling…' : 'Disable MFA'}
            </button>
          </div>
        ) : !enrolling ? (
          <div>
            <p className="text-dim text-sm" style={{ marginTop: 0 }}>
              Add an authenticator app (Google Authenticator, 1Password, Authy) as a second
              factor for sign-in.
            </p>
            <button className="btn btn-primary btn-sm" disabled={beginMut.isPending} onClick={() => beginMut.mutate()}>
              {beginMut.isPending ? 'Starting…' : 'Enroll MFA'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            <p className="text-dim text-sm" style={{ margin: 0 }}>
              Add this key to your authenticator app manually, or paste the URI below into an
              app that supports it.
            </p>
            <div className="field">
              <label className="field-label">Secret key</label>
              <input className="input text-mono" readOnly value={secret ?? ''} onClick={(e) => e.currentTarget.select()} />
            </div>
            <div className="field">
              <label className="field-label">Setup URI</label>
              <input className="input text-mono" readOnly value={provisioningUri ?? ''} onClick={(e) => e.currentTarget.select()} />
            </div>
            <div className="field">
              <label className="field-label">Enter the 6-digit code to confirm</label>
              <input
                className="input"
                inputMode="numeric"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                disabled={!code || confirmMut.isPending}
                onClick={() => confirmMut.mutate()}
              >
                {confirmMut.isPending ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEnrolling(false)
                  setSecret(null)
                  setProvisioningUri(null)
                  setCode('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtEpochSeconds(ts: number) {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return String(ts)
  }
}

function SessionsCard() {
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
    <div className="card">
      <div className="card-header">
        <strong>Active sessions</strong>
      </div>
      <div className="card-body">
        {isLoading ? (
          <LoadingRow />
        ) : error ? (
          <ErrorBanner error={error as Error} onRetry={refetch} />
        ) : sessions.length === 0 ? (
          <span className="text-faint text-sm">No active sessions</span>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Issued</th>
                  <th>Expires</th>
                  <th>IP address</th>
                  <th>User agent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtEpochSeconds(s.issued_at)}</td>
                    <td>{fmtEpochSeconds(s.expires_at)}</td>
                    <td className="mono">{s.source_ip ?? '—'}</td>
                    <td className="text-dim" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.user_agent ?? '—'}
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={revokeMut.isPending}
                        onClick={() => revokeMut.mutate(s.id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChangePasswordCard />
      <MfaCard />
      <SessionsCard />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingRow />}>
      <SettingsPageInner />
    </Suspense>
  )
}

function SettingsPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'tags' | 'lists' | 'security'>('tags')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'security' || t === 'tags' || t === 'lists') setTab(t)
  }, [searchParams])

  return (
    <div>
      <div className="tab-list">
        {([['tags', 'Tag Definitions'], ['lists', 'Managed Lists'], ['security', 'Security']] as const).map(([id, label]) => (
          <button
            key={id}
            className={`tab-btn${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tags' && <TagsSection />}
      {tab === 'lists' && <ListsSection />}
      {tab === 'security' && <SecuritySection />}
    </div>
  )
}
