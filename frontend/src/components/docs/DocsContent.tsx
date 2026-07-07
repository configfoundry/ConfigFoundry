'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Heading } from '@/lib/markdown'
import type { DocNavLink } from '@/lib/docs'

function escapeForDisplay(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatLastUpdated(iso: string | null): string | null {
  if (!iso) return null
  try {
    // Locale pinned to 'en-US' (not `undefined`) on purpose: this string is
    // rendered during SSR (Node's default locale) and again on the client
    // (the browser's locale). Those can disagree -- e.g. "July 3, 2026" on
    // the server vs "3 July 2026" on a browser set to an en-GB-style locale
    // -- which is exactly a React hydration mismatch ("Text content does
    // not match server-rendered HTML"). Pinning the locale makes both
    // renders produce the identical string regardless of the visitor's or
    // server's OS locale.
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

function currentTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/**
 * Renders one doc's HTML body plus breadcrumbs, prev/next navigation,
 * "last updated" metadata, and a sticky "On this page" table of
 * contents. Copy-to-clipboard on code blocks and Mermaid diagram
 * rendering are both single delegated/effect-driven handlers here
 * (rather than per-block scripts), so they work uniformly across every
 * doc page with no per-page setup.
 */
export function DocsContent({
  slug,
  title,
  group,
  html,
  headings,
  lastUpdated,
  prev,
  next,
}: {
  slug: string
  title: string
  group: string
  html: string
  headings: Heading[]
  lastUpdated: string | null
  prev: DocNavLink | null
  next: DocNavLink | null
}) {
  const articleRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${title} · ConfigFoundry Docs`
  }, [title])

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const btn = (e.target as HTMLElement).closest('.copy-btn') as HTMLElement | null
    if (!btn) return
    const block = btn.closest('.code-block')
    const code = block?.querySelector('code')
    if (!code) return
    navigator.clipboard
      .writeText(code.textContent ?? '')
      .then(() => {
        const original = btn.textContent
        btn.textContent = 'Copied'
        btn.classList.add('copied')
        window.setTimeout(() => {
          btn.textContent = original
          btn.classList.remove('copied')
        }, 1500)
      })
      .catch(() => {
        /* clipboard API unavailable (e.g. non-HTTPS, no permission) -- fail silently */
      })
  }

  // Scroll-spy: highlight whichever heading is currently in view.
  useEffect(() => {
    if (headings.length === 0) return
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  // Deep linking: smooth-scroll to the hash target on load/navigation,
  // accounting for the sticky top bar so the heading isn't hidden behind
  // it. Runs after the HTML is in the DOM (this effect depends on `html`
  // so it re-fires on client-side route changes between doc pages).
  useEffect(() => {
    if (!window.location.hash) return
    const id = decodeURIComponent(window.location.hash.slice(1))
    const target = document.getElementById(id)
    if (!target) return
    const raf = requestAnimationFrame(() => {
      const top = target.getBoundingClientRect().top + window.scrollY - 76
      window.scrollTo({ top, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [html])

  // Mermaid diagrams: rendered client-side from a vendored, offline npm
  // package (never a CDN -- see docs/airgap.md). If the package isn't
  // present in a given build (e.g. it hasn't been vendored yet), each
  // diagram falls back to its readable source instead of breaking the
  // page. Re-renders when the theme toggles so diagrams match dark/light.
  useEffect(() => {
    const container = articleRef.current
    if (!container) return
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('.mermaid-block'))
    if (blocks.length === 0) return
    let cancelled = false

    async function run() {
      try {
        // Imported by a variable specifier (not a string literal) on
        // purpose: this is a vendored, optional dependency (see
        // docs/airgap.md) that may not be installed in every build, so
        // we deliberately avoid static module resolution at typecheck
        // time and resolve it only at runtime, in the browser.
        const mermaidPackageName = 'mermaid'
        const mod: any = await import(mermaidPackageName)
        const mermaid = mod.default ?? mod
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: currentTheme() === 'dark' ? 'dark' : 'default',
          fontFamily: 'inherit',
        })
        let idx = 0
        for (const block of blocks) {
          if (cancelled) return
          const source = block.querySelector('.mermaid-source')?.textContent ?? ''
          const target = block.querySelector('.mermaid-render')
          if (!target || !source.trim()) continue
          try {
            const { svg } = await mermaid.render(`cf-mmd-${slug}-${idx++}`, source.trim())
            if (!cancelled) target.innerHTML = svg
          } catch {
            if (!cancelled) {
              target.innerHTML = `<pre class="mermaid-fallback"><code>${escapeForDisplay(source)}</code></pre>`
            }
          }
        }
      } catch {
        // mermaid isn't available in this build -- show readable source
        // for every diagram instead of a blank/broken area.
        if (cancelled) return
        blocks.forEach((block) => {
          const source = block.querySelector('.mermaid-source')?.textContent ?? ''
          const target = block.querySelector('.mermaid-render')
          if (target) target.innerHTML = `<pre class="mermaid-fallback"><code>${escapeForDisplay(source)}</code></pre>`
        })
      }
    }

    run()

    const observer = new MutationObserver(() => run())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [html, slug])

  const updated = formatLastUpdated(lastUpdated)

  return (
    <div className="docs-page">
      <div className="docs-article-col">
        <nav className="docs-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/documentation/">Documentation</Link>
          {group && (
            <>
              <span className="docs-breadcrumb-sep">/</span>
              <span>{group}</span>
            </>
          )}
          <span className="docs-breadcrumb-sep">/</span>
          <span className="docs-breadcrumb-current">{title}</span>
        </nav>

        <div
          ref={articleRef}
          className="docs-article"
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {updated && (
          <div className="docs-last-updated">
            Last updated <time dateTime={lastUpdated ?? undefined}>{updated}</time>
          </div>
        )}

        {(prev || next) && (
          <div className="docs-prev-next">
            {prev ? (
              <Link href={`/documentation/${prev.slug}/`} className="docs-nav-card docs-nav-prev">
                <span className="docs-nav-card-dir">← Previous</span>
                <span className="docs-nav-card-title">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/documentation/${next.slug}/`} className="docs-nav-card docs-nav-next">
                <span className="docs-nav-card-dir">Next →</span>
                <span className="docs-nav-card-title">{next.title}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {headings.length > 0 && (
        <aside className="docs-toc" aria-label="On this page">
          <div className="docs-toc-label">On this page</div>
          <nav>
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={`docs-toc-link docs-toc-level-${h.level}${activeId === h.id ? ' active' : ''}`}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  )
}
