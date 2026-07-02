'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchEntry } from '@/lib/docs'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function rank(index: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index
    .map((entry) => {
      const title = entry.title.toLowerCase()
      const headingsText = entry.headings.join(' ').toLowerCase()
      const excerpt = entry.excerpt.toLowerCase()
      let score = 0
      if (title === q) score += 200
      else if (title.startsWith(q)) score += 100
      else if (title.includes(q)) score += 50
      if (headingsText.includes(q)) score += 20
      if (excerpt.includes(q)) score += 5
      return { entry, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.entry)
}

/**
 * Client-side search used both in the docs topbar (compact) and on the
 * documentation landing page (hero). Filters the build-time search
 * index by title / heading / excerpt substring match -- no network
 * request, no external search service, works fully offline (see
 * docs/airgap.md). Supports Ctrl/Cmd+K and "/" to focus, arrow keys to
 * move through results, Enter to open, Escape to close.
 */
export function DocsSearch({
  index,
  variant = 'compact',
  placeholder = 'Search docs…',
}: {
  index: SearchEntry[]
  variant?: 'compact' | 'hero'
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => rank(index, query), [index, query])

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      const isTypingElsewhere =
        document.activeElement instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
        document.activeElement !== inputRef.current

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
        return
      }
      if (e.key === '/' && !isTypingElsewhere && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      const target = results[highlighted]
      if (target) {
        window.location.href = `/documentation/${target.slug}/`
      }
    }
  }

  return (
    <div className={`docs-search docs-search-${variant}`} ref={boxRef}>
      <div className="search-wrap docs-search-input-wrap">
        <SearchIcon />
        <input
          ref={inputRef}
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
        />
        <kbd className="docs-search-kbd">{variant === 'hero' ? '/' : '⌘K'}</kbd>
      </div>
      {open && query.trim() && (
        <div className="docs-search-results card">
          {results.length === 0 ? (
            <div className="docs-search-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((r, i) => (
              <Link
                key={r.slug}
                href={`/documentation/${r.slug}/`}
                className={`docs-search-result${i === highlighted ? ' highlighted' : ''}`}
                onMouseEnter={() => setHighlighted(i)}
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
          <div className="docs-search-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
        </div>
      )}
    </div>
  )
}
