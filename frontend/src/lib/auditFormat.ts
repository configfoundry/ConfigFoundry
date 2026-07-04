/**
 * Shared formatting helpers for audit-log data (Dashboard > Recent Activity,
 * Administration > Audit Logs). Pulled out because both surfaces were
 * independently doing `entry.actor ?? 'system'` and raw
 * `JSON.stringify(details)`, which live-testing showed rendering as a literal
 * "unknown" string (the backend's own placeholder value for system-triggered
 * actions, not absent -- so the `?? 'system'` fallback never applied) and an
 * unformatted JSON blob in the UI.
 *
 * Kept intentionally conservative: this does NOT call the users-list
 * endpoint (`api.users.list()`), since Recent Activity renders on the main
 * Dashboard for every authenticated role, and listing all org users may be
 * restricted to admin-type roles. The only identity we can safely resolve
 * client-side for any signed-in user is "is this me?" via useAuth().
 */
import type { AuditEntry } from '@/lib/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Human-friendly label for an audit entry's actor.
 *  - falsy / literal "unknown" (case-insensitive)        -> "System"
 *  - matches the signed-in user's id                     -> "You"
 *  - matches the signed-in user's email already           -> as-is
 *  - looks like a raw UUID we can't resolve               -> shortened, monospace-friendly
 *  - anything else (already an email/username)            -> as-is
 */
export function formatActor(actor: string | null | undefined, currentUserId?: string | null): string {
  if (!actor || actor.toLowerCase() === 'unknown') return 'System'
  if (currentUserId && actor === currentUserId) return 'You'
  if (UUID_RE.test(actor)) return `${actor.slice(0, 8)}…`
  return actor
}

const ACTION_LABELS: Record<string, string> = {
  generate: 'Generated Configuration',
  import_devices: 'Imported Devices',
  import_bandwidth: 'Imported Bandwidth Rows',
  import_subnets: 'Imported Subnets',
  'auth.login': 'Signed In',
  'auth.logout': 'Signed Out',
  'api_key.revoked': 'API Key Revoked',
  'api_key.created': 'API Key Created',
}

/**
 * Human-friendly label for an audit entry's raw action string (e.g.
 * "import_devices", "auth.login") -- live testing showed the Dashboard
 * timeline and Audit Logs table rendering these verbatim, snake_case and
 * dotted, next to already-friendly labels like "System"/"You", which read
 * as unfinished. Falls back to a title-cased, de-slugged version of
 * whatever action string it doesn't recognize, so a new/unmapped backend
 * action still reads as a sentence instead of breaking.
 */
export function formatAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return action
    .replace(/[._]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Human-friendly summary for an audit entry's details blob. Falls back to
 * compact JSON only when there's no recognizable `summary`/`message` field,
 * so common cases (config-generation runs, which always set `summary`) read
 * as a sentence instead of `{"summary":"..."}`.
 */
export function formatDetails(details: AuditEntry['details']): string {
  if (!details) return ''
  if (typeof details === 'string') return details
  const d = details as Record<string, unknown>
  if (typeof d.summary === 'string') return d.summary
  if (typeof d.message === 'string') return d.message
  try {
    const entries = Object.entries(d)
    if (entries.length === 0) return ''
    // Compact "key: value, key: value" instead of raw JSON punctuation.
    return entries.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ')
  } catch {
    return ''
  }
}
