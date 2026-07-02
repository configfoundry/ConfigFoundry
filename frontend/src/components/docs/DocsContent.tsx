'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Heading } from '@/lib/markdown'

/**
 * Renders one doc's HTML body plus a sticky "On this page" table of
 * contents. Copy-to-clipboard on code blocks is a single delegated
 * click handler here (rather than a script injected per code block),
 * so it works uniformly across every doc page with no per-page setup.
 */
export function DocsContent({
  title,
  html,
  headings,
}: {
  title: string
  html: string
  headings: Heading[]
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

  return (
    <div className="docs-page">
      <div
        ref={articleRef}
        className="docs-article"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
