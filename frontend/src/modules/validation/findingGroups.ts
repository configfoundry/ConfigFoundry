import type { Finding } from '@/lib/types'

export type SeverityFilter = '' | 'error' | 'warning' | 'info'

export const SEVERITY_META: Record<'error' | 'warning' | 'info', { label: string; color: 'error' | 'warning' | 'info' }> = {
  error: { label: 'Errors', color: 'error' },
  warning: { label: 'Warnings', color: 'warning' },
  info: { label: 'Suggestions', color: 'info' },
}

export type GroupKey = 'device' | 'bandwidth' | 'network' | 'other'

export const GROUP_META: Record<GroupKey, { label: string; hint?: string }> = {
  device: { label: 'Device Issues', hint: 'incl. duplicate IPs / hostnames' },
  bandwidth: { label: 'Bandwidth Issues' },
  network: { label: 'Subnet / Network Issues', hint: 'incl. duplicate CIDRs' },
  other: { label: 'Other' },
}

/**
 * Groups findings by their rule-code prefix (DEVICE_ / BW_ / SUBNET_), which
 * mirrors how core/validator.py organizes its checks. This is a presentation
 * grouping only -- it reads the existing `code` field the API already
 * returns, nothing is inferred or fabricated.
 */
export function groupKeyForCode(code: string | undefined): GroupKey {
  if (!code) return 'other'
  if (code.startsWith('DEVICE_')) return 'device'
  if (code.startsWith('BW_')) return 'bandwidth'
  if (code.startsWith('SUBNET_')) return 'network'
  return 'other'
}

export function groupFindings(findings: Finding[]): Record<GroupKey, Finding[]> {
  const groups: Record<GroupKey, Finding[]> = { device: [], bandwidth: [], network: [], other: [] }
  for (const f of findings) {
    groups[groupKeyForCode(f.code)].push(f)
  }
  return groups
}

export const DUPLICATE_DEVICE_CODES = new Set(['DEVICE_DUPLICATE_IP', 'DEVICE_DUPLICATE_HOSTNAME'])
export const BANDWIDTH_ISSUE_CODES = new Set(['BW_ORPHANED', 'BW_DUPLICATE_INTERFACE'])
