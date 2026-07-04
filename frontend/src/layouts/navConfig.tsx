// ---------------------------------------------------------------------------
// Sidebar navigation config for the app shell.
//
// This is a direct port of the NAV_GROUPS / PAGE_TITLES data that used to
// live in components/AppShell.tsx (removed as part of the Vuexy migration).
// Hrefs, permission codes, and countKey bindings are UNCHANGED -- only the
// icons changed (inline SVG -> MUI icons) and labels were regrouped to
// match the module list in the migration brief (Inventory / Administration
// / Documentation / Settings). No new routes were added.
// ---------------------------------------------------------------------------
import type { ReactElement } from 'react'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'

export interface NavItem {
  href: string
  label: string
  icon: ReactElement
  /** Key into the /meta response used to show a live count badge. */
  countKey: 'deviceCount' | 'bandwidthCount' | 'subnetCount' | null
  /** Permission code gating visibility -- same codes AuthProvider.hasPermission checks. */
  permission: string | null
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <DashboardOutlinedIcon fontSize="small" />, countKey: null, permission: null },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/inventory', label: 'Inventory', icon: <Inventory2OutlinedIcon fontSize="small" />, countKey: 'deviceCount', permission: 'inventory:read' },
      { href: '/validation', label: 'Validation', icon: <FactCheckOutlinedIcon fontSize="small" />, countKey: null, permission: 'inventory:read' },
      { href: '/generate', label: 'Generate Config', icon: <AutoFixHighOutlinedIcon fontSize="small" />, countKey: null, permission: 'deployment:execute' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/history', label: 'History', icon: <HistoryOutlinedIcon fontSize="small" />, countKey: null, permission: 'profile:read' },
      { href: '/settings', label: 'Settings', icon: <SettingsOutlinedIcon fontSize="small" />, countKey: null, permission: null },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/users', label: 'Users', icon: <PeopleOutlineOutlinedIcon fontSize="small" />, countKey: null, permission: 'user:read' },
      { href: '/admin/roles', label: 'Roles', icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />, countKey: null, permission: 'role:read' },
      { href: '/admin/api-keys', label: 'API Keys', icon: <VpnKeyOutlinedIcon fontSize="small" />, countKey: null, permission: 'api:manage' },
      { href: '/admin/policies', label: 'IP Policies', icon: <LockOutlinedIcon fontSize="small" />, countKey: null, permission: 'policy:manage' },
      // New route added in the Administration migration pass: GET /api/v1/audit
      // already existed and was already called from the Dashboard, but had no
      // standalone browsing page. See AuditLogsView.tsx for details.
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: <ReceiptLongOutlinedIcon fontSize="small" />, countKey: null, permission: 'audit:read' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/documentation/', label: 'Documentation', icon: <MenuBookOutlinedIcon fontSize="small" />, countKey: null, permission: null },
    ],
  },
]

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/validation': 'Validation',
  '/generate': 'Generate Config',
  '/history': 'History',
  '/settings': 'Settings',
  '/admin/users': 'Users',
  '/admin/roles': 'Roles',
  '/admin/api-keys': 'API Keys',
  '/admin/policies': 'IP Policies',
  '/admin/audit-logs': 'Audit Logs',
}

export const DRAWER_WIDTH = 260
export const DRAWER_WIDTH_COLLAPSED = 76
