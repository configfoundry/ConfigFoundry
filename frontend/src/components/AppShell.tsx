'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'

// ---------------------------------------------------------------------------
// Icons (inline SVG, no icon library dependency)
// ---------------------------------------------------------------------------
function Icon({ name }: { name: string }) {
  const icons: Record<string, ReactElement> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    inventory: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
    validation: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      </svg>
    ),
    generate: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    sun: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    moon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    logo: (
      <svg viewBox="0 0 28 28" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" opacity=".3" />
        <rect x="16" y="2" width="10" height="10" rx="2" fill="currentColor" opacity=".6" />
        <rect x="2" y="16" width="10" height="10" rx="2" fill="currentColor" opacity=".6" />
        <rect x="16" y="16" width="10" height="10" rx="2" fill="currentColor" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    key: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  }
  return icons[name] ?? null
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',  label: 'Dashboard',    icon: 'dashboard',   countKey: null, permission: null },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/inventory',  label: 'Inventory',    icon: 'inventory',   countKey: 'deviceCount' as const, permission: 'inventory:read' },
      { href: '/validation', label: 'Validation',   icon: 'validation',  countKey: null, permission: 'inventory:read' },
      { href: '/generate',   label: 'Generate YAML', icon: 'generate',   countKey: null, permission: 'deployment:execute' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/history',    label: 'History',      icon: 'history',     countKey: null, permission: 'profile:read' },
      { href: '/settings',   label: 'Settings',     icon: 'settings',    countKey: null, permission: null },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users',    label: 'Users',     icon: 'users',  countKey: null, permission: 'user:read' },
      { href: '/admin/roles',    label: 'Roles',     icon: 'shield', countKey: null, permission: 'role:read' },
      { href: '/admin/api-keys', label: 'API Keys',  icon: 'key',    countKey: null, permission: 'api:manage' },
      { href: '/admin/policies', label: 'IP Policies', icon: 'lock', countKey: null, permission: 'policy:manage' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Page titles
// ---------------------------------------------------------------------------
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/inventory':  'Inventory',
  '/validation': 'Validation',
  '/generate':   'Generate YAML',
  '/history':    'History',
  '/settings':   'Settings',
  '/admin/users': 'Users',
  '/admin/roles': 'Roles',
  '/admin/api-keys': 'API Keys',
  '/admin/policies': 'IP Policies',
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, hasPermission, logout } = useAuth()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cf-theme')
      if (saved === 'light' || saved === 'dark') setThemeState(saved)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('cf-theme', next) } catch {}
  }, [theme])

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
    refetchInterval: 60_000,
  })

  const pageTitle = PAGE_TITLES[pathname] ?? 'ConfigFoundry'

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0)

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    router.push('/login')
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span style={{ color: 'var(--primary)' }}>
            <Icon name="logo" />
          </span>
          <span className="sidebar-brand-name">
            Config<span className="accent">Foundry</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const active = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                const count = item.countKey && meta ? meta[item.countKey] : null
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${active ? ' active' : ''}`}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                    {count != null && (
                      <span className="nav-badge">{count}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>v0.5</span>
          <a
            href="https://github.com/shivamsancc/ConfigFoundry"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-actions">
            {meta && (
              <>
                <span className="topbar-stat">
                  <strong>{meta.deviceCount}</strong> devices
                </span>
                <span className="topbar-stat">
                  <strong>{meta.bandwidthCount}</strong> bw rows
                </span>
                <span className="topbar-stat">
                  <strong>{meta.subnetCount}</strong> subnets
                </span>
              </>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: 30, height: 30 }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>

            {user && (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--primary-bg)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {(user.email ?? user.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span>{user.email ?? user.name ?? 'Account'}</span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 36,
                        minWidth: 200,
                        zIndex: 50,
                        padding: 6,
                      }}
                    >
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{user.email ?? user.name ?? 'Account'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          {user.roles?.map((r) => r.name).join(', ') || 'No roles assigned'}
                        </div>
                      </div>
                      <Link
                        href="/settings?tab=security"
                        className="nav-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Icon name="lock" />
                        <span>Security settings</span>
                      </Link>
                      <button
                        className="nav-item"
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onClick={handleLogout}
                      >
                        <Icon name="logout" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}
