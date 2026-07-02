'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import type { DocGroup, SearchEntry } from '@/lib/docs'

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
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  return `/docs/${slug}/`
}

// ---------------------------------------------------------------------------
// Search box -- client-side, filters the build-time search index by
// title / heading / excerpt substring match. No network request, no
// external search service: works fully offline. See docs/airgap.md.
// ---------------------------------------------------------------------------
function DocsSearch({ index }: { index: SearchEntry[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const el = boxRef.current?.querySelector('input') as HTMLInputElement | null
        el?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const scored = index
      .map((entry) => {
        const title = entry.title.toLowerCase()
        const headings = entry.headings.join(' ').toLowerCase()
        const excerpt = entry.excerpt.toLowerCase()
        let score = 0
        if (title.includes(q)) score += title.startsWith(q) ? 100 : 50
        if (headings.includes(q)) score += 20
        if (excerpt.includes(q)) score += 5
        return { entry, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
    return scored.map((r) => r.entry)
  }, [query, index])

  return (
    <div className="docs-search" ref={boxRef}>
      <div className="search-wrap">
        <Icon name="search" />
        <input
          className="input"
          placeholder="Search docs…  (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && query.trim() && (
        <div className="docs-search-results card">
          {results.length === 0 ? (
            <div className="docs-search-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((r) => (
              <Link
                key={r.slug}
                href={slugToHref(r.slug)}
                className="docs-search-result"
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                }}
              >
                <div className="docs-search-result-title">{r.title}</div>
                <div className="docs-search-result-group">{r.group}</div>
                {r.excerpt && <div className="docs-search-result-excerpt">{r.excerpt}</div>}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
export function DocsShell({
  groups,
  searchIndex,
  children,
}: {
  groups: DocGroup[]
  searchIndex: SearchEntry[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const isActive = (slug: string) => pathname === slugToHref(slug)

  return (
    <div className="docs-shell" data-nav-open={mobileNavOpen ? 'true' : 'false'}>
      <header className="docs-topbar">
        <button
          className="btn btn-ghost btn-icon docs-nav-toggle"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <Icon name={mobileNavOpen ? 'close' : 'menu'} />
        </button>

        <Link href="/docs/" className="docs-brand">
          <span style={{ color: 'var(--primary)' }}>
            <Icon name="logo" />
          </span>
          <span className="sidebar-brand-name">
            Config<span className="accent">Foundry</span>
          </span>
          <span className="badge badge-neutral docs-badge">Docs</span>
        </Link>

        <div className="docs-topbar-search">
          <DocsSearch index={searchIndex} />
        </div>

        <div className="docs-topbar-actions">
          <Link href="/dashboard" className="btn btn-secondary btn-sm docs-app-link">
            <Icon name="app" />
            <span>Open app</span>
          </Link>
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
            <a href="https://github.com/shivamsancc/ConfigFoundry" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </div>
        </aside>

        <main className="docs-main">{children}</main>
      </div>
    </div>
  )
}
