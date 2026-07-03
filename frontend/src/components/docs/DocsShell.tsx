'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import type { DocGroup, SearchEntry } from '@/lib/docs'
import { DocsSearch } from './DocsSearch'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

// ---------------------------------------------------------------------------
// Icons (inline SVG, no icon library dependency -- mirrors AppShell.tsx)
// ---------------------------------------------------------------------------
function Icon({ name }: { name: string }) {
  const icons: Record<string, ReactElement> = {
    logo: (
      <svg viewBox="0 0 28 28" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" opacity=".3" />
        <rect x="16" y="2" width="10" height="10" rx="2" fill="currentColor" opacity=".6" />
        <rect x="2" y="16" width="10" height="10" rx="2" fill="currentColor" opacity=".6" />
        <rect x="16" y="16" width="10" height="10" rx="2" fill="currentColor" />
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
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    app: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    ),
    help: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.9.75c0 1.5-2 1.75-2.4 2.75" />
        <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
      </svg>
    ),
  }
  return icons[name] ?? null
}

function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cf-theme')
      if (saved === 'light' || saved === 'dark') setThemeState(saved)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem('cf-theme', next)
      } catch {}
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

function slugToHref(slug: string) {
  return `/documentation/${slug}/`
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
export function DocsShell({
  groups,
  searchIndex,
  version,
  children,
}: {
  groups: DocGroup[]
  searchIndex: SearchEntry[]
  version: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        document.activeElement instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      if (e.key === '?' && !typing) {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const isActive = (slug: string) => pathname === slugToHref(slug)

  return (
    <div className="docs-shell" data-nav-open={mobileNavOpen ? 'true' : 'false'}>
      <a href="#docs-main-content" className="docs-skip-link">
        Skip to content
      </a>

      <header className="docs-topbar">
        <button
          className="btn btn-ghost btn-icon docs-nav-toggle"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <Icon name={mobileNavOpen ? 'close' : 'menu'} />
        </button>

        <Link href="/documentation/" className="docs-brand">
          <span style={{ color: 'var(--primary)' }}>
            <Icon name="logo" />
          </span>
          <span className="sidebar-brand-name">
            Config<span className="accent">Foundry</span>
          </span>
          <span className="badge badge-neutral docs-badge">Docs</span>
          <span className="docs-version-badge" title="Documentation version">
            v{version}
          </span>
        </Link>

        <div className="docs-topbar-search">
          <DocsSearch index={searchIndex} variant="compact" />
        </div>

        <div className="docs-topbar-actions">
          <Link href="/dashboard" className="btn btn-secondary btn-sm docs-app-link">
            <Icon name="app" />
            <span>Open app</span>
          </Link>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
          >
            <Icon name="help" />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <div className="docs-body">
        <aside className="docs-sidebar">
          <nav className="docs-sidebar-nav">
            {groups.map((group) => (
              <div key={group.label} className="docs-nav-group">
                <div className="nav-group-label">{group.label}</div>
                {group.docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={slugToHref(doc.slug)}
                    className={`nav-item docs-nav-item${isActive(doc.slug) ? ' active' : ''}`}
                  >
                    <span>{doc.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span>ConfigFoundry Docs</span>
            <a href="https://github.com/configfoundry/ConfigFoundry" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </div>
        </aside>

        <main className="docs-main" id="docs-main-content">
          {children}
        </main>
      </div>

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
