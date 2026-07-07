/**
 * Shared device classification helpers -- extracted from DevicesView.tsx
 * so the new Device Details page (and any future device-related view) reuses
 * the exact same logic instead of duplicating it. No behavior change: this
 * is the same code that lived inline in DevicesView.tsx.
 */
import type { Device } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'

export const ICMP_TYPES = new Set(['icmp', 'snmp trap', 'storage'])

export type DeviceStatus = 'configured' | 'attention'

export const STATUS_META: Record<DeviceStatus, { label: string; color: ThemeColor }> = {
  configured: { label: 'Configured', color: 'success' },
  attention: { label: 'Needs Attention', color: 'warning' },
}

// ---------------------------------------------------------------------------
// Device Icons -- presentation enhancement only, never a data requirement.
//
// ConfigFoundry intentionally does NOT have a built-in "Device Type" field.
// The old fixed dropdowns (Device Class / Device Category / Device Type)
// were deliberately retired in favor of the dynamic TagDef system
// (core/migrations_legacy.py, migration 3) -- reintroducing a hardcoded
// field here would contradict that decision.
//
// "Device Type" below is read purely as an OPTIONAL dynamic tag
// (d['Device Type']). If an administrator defines that tag through the
// Tags admin UI (TagService.create_or_update, scoped to "devices"), matching
// devices automatically get a specific icon the next time this renders --
// no code change needed. If the tag doesn't exist for a deployment, or a
// device's value doesn't match a known one, every device just falls back to
// a generic "unknown device" icon. Nothing ever fails or requires this tag.
// ---------------------------------------------------------------------------
export const DEVICE_TYPE_META: Record<string, { icon: string; color: ThemeColor }> = {
  router: { icon: 'tabler:router', color: 'primary' },
  switch: { icon: 'tabler:topology-star', color: 'info' },
  firewall: { icon: 'tabler:firewall-flame', color: 'error' },
  server: { icon: 'tabler:server-2', color: 'success' },
  'access point': { icon: 'tabler:access-point', color: 'info' },
  storage: { icon: 'tabler:database', color: 'secondary' },
  'load balancer': { icon: 'tabler:load-balancer', color: 'warning' },
  'virtual machine': { icon: 'tabler:cpu', color: 'primary' },
}
export const UNKNOWN_DEVICE_TYPE = { icon: 'tabler:device-unknown', color: 'secondary' as ThemeColor }

export const CONFIG_TYPE_META: Record<string, { icon: string; color: ThemeColor }> = {
  snmp: { icon: 'tabler:shield-lock', color: 'primary' },
  icmp: { icon: 'tabler:antenna', color: 'info' },
  'snmp trap': { icon: 'tabler:bell-ringing', color: 'warning' },
  storage: { icon: 'tabler:database', color: 'secondary' },
}
export const UNSET_CONFIG_TYPE = { icon: 'tabler:help-circle', color: 'secondary' as ThemeColor }

export function deviceStatus(d: Device): DeviceStatus {
  const cfgType = ((d['Config Type'] as string) ?? '').toLowerCase().trim()
  const isIcmp = ICMP_TYPES.has(cfgType)
  const missingRegion = !d['Collector Region']
  const missingCreds = !isIcmp && !d.snmpUser
  return missingRegion || missingCreds ? 'attention' : 'configured'
}

/** Reads the optional "Device Type" dynamic tag (see the block comment
 * above DEVICE_TYPE_META) and resolves it to an icon. Devices without the
 * tag, or with a value this app doesn't recognize, get the generic
 * UNKNOWN_DEVICE_TYPE icon -- this function never throws and never blocks
 * rendering on the tag's absence. */
export function deviceTypeMeta(d: Device) {
  const key = String(d['Device Type'] ?? '').toLowerCase().trim()
  return DEVICE_TYPE_META[key] ?? UNKNOWN_DEVICE_TYPE
}

export function configTypeMeta(d: Device) {
  const key = ((d['Config Type'] as string) ?? '').toLowerCase().trim()
  return CONFIG_TYPE_META[key] ?? UNSET_CONFIG_TYPE
}

/** True if a Config Type value requires SNMPv3 credentials (i.e. is not one
 * of the ICMP-only classifications). Same rule used by deviceStatus(). */
export function isSnmpConfigType(d: Device): boolean {
  const cfgType = ((d['Config Type'] as string) ?? '').toLowerCase().trim()
  return !ICMP_TYPES.has(cfgType)
}

export interface ValidationStatus {
  total: number
  passed: number
  warnings: number
  failed: number
  passPct: number
}

/**
 * Tri-state validation classification (Passed / Warnings / Failed), shared
 * by the Dashboard's KPI rail and its Inventory Health panel. Pulled into
 * one place after those two surfaces were found computing this
 * independently (one as a binary configured/needs-attention split, the
 * other as this tri-state split) and showing two different numbers for
 * what a user reasonably expects to be the same fact. Duplicate-IP is
 * treated as Failed (a real conflict the Generate workflow also checks via
 * `hasIssues`), missing region/credentials as Warning (administrative
 * incompleteness, not a conflict), matching the same rule Configuration >
 * Generate uses to decide whether to prompt "generate anyway?".
 */
export function validationStatus(devices: Device[]): ValidationStatus {
  const ipCounts = new Map<string, number>()
  for (const d of devices) {
    if (!d.IP) continue
    ipCounts.set(d.IP, (ipCounts.get(d.IP) ?? 0) + 1)
  }
  const failed = devices.filter((d) => d.IP && (ipCounts.get(d.IP) ?? 0) > 1).length
  const warnings = devices.filter((d) => {
    if (d.IP && (ipCounts.get(d.IP) ?? 0) > 1) return false
    return deviceStatus(d) === 'attention'
  }).length
  const total = devices.length
  const passed = total - failed - warnings
  const passPct = total === 0 ? 100 : Math.round((passed / total) * 100)
  return { total, passed, warnings, failed, passPct }
}
