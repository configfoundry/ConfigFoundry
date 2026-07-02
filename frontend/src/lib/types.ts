// ---------------------------------------------------------------------------
// TypeScript types for the ConfigFoundry v1 API
// ---------------------------------------------------------------------------

/** Network device (SNMP / ICMP-only) */
export interface Device {
  id: string
  IP: string
  Device?: string
  'Collector Region'?: string
  'Config Type'?: string
  snmpUser?: string
  authProtocol?: string
  authKey?: string
  privProtocol?: string
  privKey?: string
  Remarks?: string
  // Dynamic tag keys
  [key: string]: unknown
}

/** Bandwidth cap row */
export interface BandwidthRow {
  id: string
  IP: string
  Interface?: string
  'Allocated BW'?: number | string
  Region?: string
  Center?: string
  'Link Type'?: string
  Interface_description?: string
  [key: string]: unknown
}

/** Subnet definition */
export interface Subnet {
  id: string
  CIDR: string
  Description?: string
  tags?: Record<string, string>
  [key: string]: unknown
}

/** Tag definition */
export interface TagDef {
  id: string
  name: string
  label?: string
  type: 'enum' | 'text' | 'boolean'
  values?: string[]
  required?: boolean
  /** Which inventory sections this tag applies to: 'devices' | 'bandwidth' | 'subnets' */
  scopes?: string[]
}

/** Audit entry — details is a parsed dict from the backend, not a string */
export interface AuditEntryDetails {
  [key: string]: unknown
}

/** A managed list (e.g. Collector Regions) */
export interface ManagedList {
  name: string
  items: string[]
}

/** /api/v1/lists response */
export interface ListsResponse {
  lists: Record<string, string[]>
}

/** /api/v1/meta response */
export interface Meta {
  deviceCount: number
  bandwidthCount: number
  subnetCount: number
  lastSavedAt: string | null
  lastSavedBy: string | null
}

/** A single finding from validation / generation */
export interface Finding {
  severity: 'error' | 'warning' | 'info'
  code?: string
  message: string
  deviceId?: string
  device?: string
  field?: string
  details?: string
}

/**
 * Generation group statistics keyed by normalised group key.
 * Matches what core/logic.py returns under "groupStats".
 */
export type GroupStats = Record<string, {
  snmp_count: number
  icmp_only_count: number
  missing_creds_count: number
  bw_devices: number
  bw_interfaces: number
}>

/** /api/v1/generate response */
export interface GenerateResult {
  files: Record<string, string>
  groupStats: GroupStats
  summary: string
  findings: Finding[]
  snmpTotal?: number
  icmpTotal?: number
  /** Devices missing SNMPv3 credentials (included in output with warnings) */
  missingCredsDevices?: unknown[]
  /** Devices with no Collector Region (excluded from all output files) */
  missingRegionDevices?: unknown[]
  /** Count of devices skipped due to no IP */
  skippedDevices?: number
  /** Bandwidth rows with no matching device */
  orphanedBwIps?: string[]
}

/** Compact history entry from GET /api/v1/history */
export interface HistoryEntry {
  id: string
  ts: string
  actor?: string
  summary?: string
}

/** Full history entry from GET /api/v1/history/{id}
 *  The backend returns { id, ts, actor, summary, files: {filename: yamlContent} }
 */
export interface HistoryDetail {
  id: string
  ts: string
  actor?: string
  summary?: string
  /** Map of filename → YAML content */
  files: Record<string, string>
}

/** Audit log entry.
 *  NOTE: backend returns details as a parsed dict (json.loads), NOT a string.
 */
export interface AuditEntry {
  id?: string
  ts: string
  actor?: string
  action: string
  entity?: string
  entityId?: string
  details?: Record<string, unknown> | string | null
}

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

export interface DevicesResponse { devices: Device[] }
export interface BandwidthResponse { rows: BandwidthRow[] }
export interface SubnetsResponse { subnets: Subnet[] }
export interface TagsResponse { tagDefs: TagDef[] }
export interface HistoryListResponse { entries: HistoryEntry[] }
export interface AuditResponse { entries: AuditEntry[] }

// ---------------------------------------------------------------------------
// Import / validate
// ---------------------------------------------------------------------------

export type ImportMode = 'merge' | 'replace'

export interface ValidationIssue {
  row: number
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidateImportResponse {
  valid: boolean
  errors?: ValidationIssue[]
  warnings?: ValidationIssue[]
  preview?: Device[] | BandwidthRow[] | Subnet[]
}

export interface ImportResponse {
  imported: number
  updated?: number
  deleted?: number
  skipped?: number
}

// ---------------------------------------------------------------------------
// Auth / RBAC / policy
// ---------------------------------------------------------------------------

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface MfaRequiredResponse {
  mfa_required: true
  mfa_token: string
}

export type LoginResponse = TokenPair | MfaRequiredResponse

export interface MeResponse {
  kind: 'user' | 'api_key'
  id: string
  email?: string
  full_name?: string
  name?: string
  org_id: string | null
  mfa_enabled?: boolean
  must_change_password?: boolean
  roles?: { id: string; name: string }[]
  permissions: string[]
}

export interface AppUser {
  id: string
  org_id: string
  email: string
  username?: string | null
  full_name?: string | null
  is_active: boolean
  is_verified: boolean
  mfa_enabled: boolean
  must_change_password: boolean
  last_login_at: number | null
  created_at: number
  updated_at: number
  roles?: Role[]
}

export interface Permission {
  id: string
  code: string
  category?: string | null
  description?: string | null
}

export interface Role {
  id: string
  org_id: string | null
  name: string
  description?: string | null
  is_system: boolean
  created_at: number
  permissions: string[]
}

export interface ApiKeySummary {
  id: string
  org_id: string
  name: string
  owner_user_id: string | null
  key_prefix: string
  permissions: string[]
  allowed_ips: string[]
  environment: string
  enabled: boolean
  expires_at: number | null
  last_used_at: number | null
  created_at: number
  revoked_at: number | null
}

export interface ApiKeyIssued {
  id: string
  name: string
  api_key: string
  key_prefix: string
  permissions: string[]
  expires_at: number | null
}

export interface NetworkACLRule {
  id: string
  org_id: string | null
  rule_type: 'allow' | 'deny'
  cidr: string
  description?: string | null
  priority: number
  enabled: boolean
  created_by?: string | null
  created_at: number
}

export interface SessionInfo {
  id: string
  issued_at: number
  expires_at: number
  source_ip: string | null
  user_agent: string | null
}

export interface SecurityAuditEntry {
  id: string
  ts: string
  actor: string | null
  action: string
  details: Record<string, unknown> | null
  org_id?: string | null
  actor_type?: string | null
  source_ip?: string | null
  user_agent?: string | null
  resource_type?: string | null
  resource_id?: string | null
  result?: string | null
  correlation_id?: string | null
}
