/**
 * Typed fetch wrappers for the ConfigFoundry /api/v1 REST API.
 *
 * In production (static export served by FastAPI) all URLs are relative.
 * In development the Next.js dev server rewrites /api/* → FastAPI:8420.
 *
 * Authentication
 * --------------
 * Every request carries `Authorization: Bearer <access_token>` once a
 * token has been set via `setAccessToken()` (done by AuthProvider on
 * login / silent refresh). On a 401, `request()` makes ONE attempt to
 * silently refresh via the registered refresh callback and retries the
 * original call; if that also fails, the registered auth-failure
 * callback runs (AuthProvider clears state and redirects to /login).
 */
import type {
  ApiKeyIssued,
  ApiKeySummary,
  AppUser,
  AuditResponse,
  BandwidthResponse,
  BandwidthRow,
  Device,
  DevicesResponse,
  GenerateResult,
  HistoryDetail,
  HistoryListResponse,
  ImportMode,
  ImportResponse,
  ListsResponse,
  LoginResponse,
  MeResponse,
  Meta,
  NetworkACLRule,
  Permission,
  Role,
  SecurityAuditEntry,
  SessionInfo,
  Subnet,
  SubnetsResponse,
  TagDef,
  TagsResponse,
  TokenPair,
  ValidateImportResponse,
} from './types'

const BASE = '/api/v1'

// ---------------------------------------------------------------------------
// Token store (module-level, not React state -- api.ts is plain JS/TS with
// no framework dependency of its own; AuthProvider is the single writer).
// ---------------------------------------------------------------------------

let _accessToken: string | null = null
let _refreshFn: (() => Promise<string | null>) | null = null
let _onAuthFailure: (() => void) | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  _refreshFn = fn
}

export function setAuthFailureHandler(fn: (() => void) | null) {
  _onAuthFailure = fn
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const _AUTH_ENDPOINTS_NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/mfa/verify']

async function rawRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ res: Response; data: T | null }> {
  const opts: RequestInit = { method, headers: {} }
  const headers = opts.headers as Record<string, string>

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch (e) {
    throw new ApiError(0, `Network error: ${(e as Error).message}`)
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return { res, data: data as T | null }
}

async function request<T>(method: string, path: string, body?: unknown, _isRetry = false): Promise<T> {
  const { res, data } = await rawRequest<T>(method, path, body)

  if (res.status === 401 && !_isRetry && !_AUTH_ENDPOINTS_NO_RETRY.includes(path)) {
    if (_refreshFn) {
      const newToken = await _refreshFn()
      if (newToken) {
        return request<T>(method, path, body, true)
      }
    }
    _onAuthFailure?.()
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : null) ??
      (data && typeof data === 'object' && 'detail' in data
        ? String((data as Record<string, unknown>).detail)
        : null) ??
      res.statusText ??
      `HTTP ${res.status}`
    throw new ApiError(res.status, msg, data)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const api = {
  // Meta
  getMeta: () => request<Meta>('GET', '/meta'),

  // Devices
  getDevices: () => request<DevicesResponse>('GET', '/devices'),
  upsertDevice: (device: Partial<Device>, actor?: string) =>
    request<{ device: Device }>('POST', '/devices', { device, _actor: actor }),
  deleteDevice: (id: string, actor?: string) =>
    request<{ deleted: string }>('DELETE', `/devices/${encodeURIComponent(id)}?_actor=${encodeURIComponent(actor ?? '')}`),
  validateImportDevices: (devices: unknown[], mode: ImportMode = 'merge') =>
    request<ValidateImportResponse>('POST', '/devices/validate-import', { devices, mode }),
  importDevices: (devices: unknown[], mode: ImportMode = 'merge', actor?: string) =>
    request<ImportResponse>('POST', '/devices/import', { devices, mode, _actor: actor }),

  // Bandwidth
  getBandwidth: () => request<BandwidthResponse>('GET', '/bandwidth'),
  upsertBandwidth: (row: Partial<BandwidthRow>, actor?: string) =>
    request<{ row: BandwidthRow }>('POST', '/bandwidth', { row, _actor: actor }),
  deleteBandwidth: (id: string, actor?: string) =>
    request<{ deleted: string }>('DELETE', `/bandwidth/${encodeURIComponent(id)}?_actor=${encodeURIComponent(actor ?? '')}`),
  validateImportBandwidth: (rows: unknown[], mode: ImportMode = 'merge') =>
    request<ValidateImportResponse>('POST', '/bandwidth/validate-import', { rows, mode }),
  importBandwidth: (rows: unknown[], mode: ImportMode = 'merge', actor?: string) =>
    request<ImportResponse>('POST', '/bandwidth/import', { rows, mode, _actor: actor }),

  // Subnets
  getSubnets: () => request<SubnetsResponse>('GET', '/subnets'),
  upsertSubnet: (subnet: Partial<Subnet>, actor?: string) =>
    request<{ subnet: Subnet }>('POST', '/subnets', { subnet, _actor: actor }),
  deleteSubnet: (id: string, actor?: string) =>
    request<{ deleted: string }>('DELETE', `/subnets/${encodeURIComponent(id)}?_actor=${encodeURIComponent(actor ?? '')}`),
  validateImportSubnets: (subnets: unknown[], mode: ImportMode = 'merge') =>
    request<ValidateImportResponse>('POST', '/subnets/validate-import', { subnets, mode }),
  importSubnets: (subnets: unknown[], mode: ImportMode = 'merge', actor?: string) =>
    request<ImportResponse>('POST', '/subnets/import', { subnets, mode, _actor: actor }),

  // Tags
  getTags: () => request<TagsResponse>('GET', '/tags'),
  upsertTag: (tagDef: Partial<TagDef>, actor?: string) =>
    request<{ tagDef: TagDef }>('POST', '/tags', { tagDef, _actor: actor }),
  deleteTag: (id: string, actor?: string, force = false) =>
    request<{ deleted: string }>(
      'DELETE',
      `/tags/${encodeURIComponent(id)}?_actor=${encodeURIComponent(actor ?? '')}&force=${force}`,
    ),
  tagUsage: (id: string, value?: string) => {
    const q = value !== undefined ? `?value=${encodeURIComponent(value)}` : ''
    return request<{ count: number }>('GET', `/tags/${encodeURIComponent(id)}/usage${q}`)
  },

  // Lists
  getLists: () => request<ListsResponse>('GET', '/lists'),
  setList: (name: string, items: string[], actor?: string) =>
    request<{ items: string[] }>('POST', `/lists/${encodeURIComponent(name)}`, { items, _actor: actor }),

  // Generate
  generate: (actor?: string) => request<GenerateResult>('POST', '/generate', { _actor: actor }),

  // History
  getHistory: (limit = 50) => request<HistoryListResponse>('GET', `/history?limit=${limit}`),
  getHistoryEntry: (id: string) => request<HistoryDetail>('GET', `/history/${encodeURIComponent(id)}`),

  // Audit
  getAudit: (limit = 100) => request<AuditResponse>('GET', `/audit?limit=${limit}`),
  searchSecurityAudit: (params: { actor?: string; action?: string; result?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params.actor) q.set('actor', params.actor)
    if (params.action) q.set('action', params.action)
    if (params.result) q.set('result', params.result)
    q.set('limit', String(params.limit ?? 100))
    return request<{ entries: SecurityAuditEntry[] }>('GET', `/audit/search?${q.toString()}`)
  },

  // Export -- authenticated blob download (plain <a href> can't carry the
  // Authorization header, so this fetches the file and triggers the save
  // via a temporary object URL instead of a direct link).
  exportUrl: (type: 'devices' | 'bandwidth' | 'subnets') => `${BASE}/export/${type}.xlsx`,
  exportDownload: async (type: 'devices' | 'bandwidth' | 'subnets', _isRetry = false): Promise<void> => {
    const res = await fetch(`${BASE}/export/${type}.xlsx`, {
      headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {},
    })
    if (res.status === 401 && !_isRetry && _refreshFn) {
      const newToken = await _refreshFn()
      if (newToken) return api.exportDownload(type, true)
      _onAuthFailure?.()
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try {
        const data = await res.json()
        if (data && typeof data === 'object' && 'error' in data) msg = String(data.error)
      } catch { /* body wasn't JSON (e.g. binary) -- keep the generic message */ }
      throw new ApiError(res.status, msg)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_export.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  // -------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>('POST', '/auth/login', { email, password }),
    mfaVerify: (mfa_token: string, code: string) =>
      request<TokenPair>('POST', '/auth/mfa/verify', { mfa_token, code }),
    refresh: (refresh_token: string) =>
      request<TokenPair>('POST', '/auth/refresh', { refresh_token }),
    logout: (refresh_token: string) =>
      request<{ logged_out: boolean }>('POST', '/auth/logout', { refresh_token }),
    logoutAll: () => request<{ logged_out: boolean }>('POST', '/auth/logout-all'),
    me: () => request<MeResponse>('GET', '/auth/me'),
    changePassword: (old_password: string, new_password: string) =>
      request<{ changed: boolean }>('POST', '/auth/password/change', { old_password, new_password }),
    mfaEnrollBegin: () =>
      request<{ secret: string; provisioning_uri: string }>('POST', '/auth/mfa/enroll/begin'),
    mfaEnrollConfirm: (secret: string, code: string) =>
      request<{ backup_codes: string[] }>('POST', '/auth/mfa/enroll/confirm', { secret, code }),
    mfaDisable: () => request<{ disabled: boolean }>('POST', '/auth/mfa/disable'),
    listSessions: () => request<{ sessions: SessionInfo[] }>('GET', '/auth/sessions'),
    revokeSession: (id: string) => request<{ revoked: string }>('DELETE', `/auth/sessions/${encodeURIComponent(id)}`),
  },

  // -------------------------------------------------------------------
  // Users (admin)
  // -------------------------------------------------------------------
  users: {
    list: () => request<{ users: AppUser[] }>('GET', '/users'),
    get: (id: string) => request<{ user: AppUser }>('GET', `/users/${encodeURIComponent(id)}`),
    create: (email: string, password: string, full_name?: string) =>
      request<{ user: AppUser }>('POST', '/users', { email, password, full_name }),
    update: (id: string, changes: { full_name?: string; username?: string }) =>
      request<{ user: AppUser }>('PATCH', `/users/${encodeURIComponent(id)}`, changes),
    deactivate: (id: string) => request<{ user: AppUser }>('DELETE', `/users/${encodeURIComponent(id)}`),
    reactivate: (id: string) => request<{ user: AppUser }>('POST', `/users/${encodeURIComponent(id)}/reactivate`),
    assignRole: (id: string, role_id: string) =>
      request<{ roles: Role[] }>('POST', `/users/${encodeURIComponent(id)}/roles`, { role_id }),
    unassignRole: (id: string, roleId: string) =>
      request<{ roles: Role[] }>('DELETE', `/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(roleId)}`),
    resetPassword: (id: string, new_password: string) =>
      request<{ reset: boolean }>('POST', `/users/${encodeURIComponent(id)}/reset-password`, { new_password }),
  },

  // -------------------------------------------------------------------
  // Roles (admin)
  // -------------------------------------------------------------------
  roles: {
    list: () => request<{ roles: Role[] }>('GET', '/roles'),
    get: (id: string) => request<{ role: Role }>('GET', `/roles/${encodeURIComponent(id)}`),
    permissions: () => request<{ permissions: Permission[] }>('GET', '/permissions'),
    create: (name: string, description: string, permissions: string[]) =>
      request<{ role: Role }>('POST', '/roles', { name, description, permissions }),
    updatePermissions: (id: string, permissions: string[]) =>
      request<{ role: Role }>('PATCH', `/roles/${encodeURIComponent(id)}/permissions`, { permissions }),
    delete: (id: string) => request<{ deleted: string }>('DELETE', `/roles/${encodeURIComponent(id)}`),
  },

  // -------------------------------------------------------------------
  // API keys (admin)
  // -------------------------------------------------------------------
  apiKeys: {
    list: () => request<{ api_keys: ApiKeySummary[] }>('GET', '/api-keys'),
    create: (params: { name: string; permissions: string[]; allowed_ips?: string[]; environment?: string; expires_at?: number | null }) =>
      request<ApiKeyIssued>('POST', '/api-keys', params),
    revoke: (id: string) => request<{ revoked: string }>('DELETE', `/api-keys/${encodeURIComponent(id)}`),
  },

  // -------------------------------------------------------------------
  // Access policies (admin)
  // -------------------------------------------------------------------
  policies: {
    listNetworkAcls: () => request<{ rules: NetworkACLRule[] }>('GET', '/policies/network-acls'),
    createNetworkAcl: (params: { rule_type: 'allow' | 'deny'; cidr: string; description?: string; priority?: number }) =>
      request<{ rule: NetworkACLRule }>('POST', '/policies/network-acls', params),
    setEnabled: (id: string, enabled: boolean) =>
      request<{ id: string; enabled: boolean }>('PATCH', `/policies/network-acls/${encodeURIComponent(id)}/enabled?enabled=${enabled}`),
    delete: (id: string) => request<{ deleted: string }>('DELETE', `/policies/network-acls/${encodeURIComponent(id)}`),
  },
}

export { ApiError }
