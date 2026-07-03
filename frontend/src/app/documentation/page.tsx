import Link from 'next/link'
import { getAllDocsMeta, getSearchIndex, getVersion } from '@/lib/docs'
import { DocsSearch } from '@/components/docs/DocsSearch'

const GROUP_ICON_PATHS: Record<string, string> = {
  'Getting Started': '<path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8 1-2 1-2s-1.2-.2-2-1zM12 15l-3-3 9-9 3 3-9 9z"/><path d="M9 12 4 7l4-4 3 3"/>',
  'Air-Gap & Enterprise': '<path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z"/><path d="M9 12l2 2 4-4"/>',
  'Architecture & API': '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  'Access Control': '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  'Data & Storage': '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
  Operations: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  Compliance: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  Contributing: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8 6.5l7.5 4M8 17.5l7.5-4"/>',
}

const QUICK_LINKS = [
  { slug: 'getting-started', title: 'Getting Started', description: 'From zero to a running instance in about five minutes.' },
  { slug: 'installation', title: 'Installation', description: 'Every installation method, including fully offline.' },
  { slug: 'api', title: 'API Reference', description: 'Every REST endpoint, request/response shapes, auth requirements.' },
  { slug: 'airgap', title: 'Air-Gap Deployment', description: 'Zero internet access, verified automatically in CI.' },
]

export default function DocumentationHome() {
  const groups = getAllDocsMeta()
  const searchIndex = getSearchIndex()
  const version = getVersion()
  const totalPages = groups.reduce((n, g) => n + g.docs.length, 0)

  return (
    <div className="docs-home">
      <section className="docs-hero">
        <span className="badge badge-neutral docs-hero-version">v{version}</span>
        <h1>ConfigFoundry Documentation</h1>
        <p className="docs-hero-sub">
          Everything you need to install, operate, extend, and deploy ConfigFoundry —
          including in fully air-gapped environments. {totalPages} pages, updated with every release.
        </p>
        <div className="docs-hero-search">
          <DocsSearch index={searchIndex} variant="hero" placeholder="Search installation, API, RBAC, air-gap…" />
        </div>
      </section>

      <section className="docs-quicklinks">
        {QUICK_LINKS.map((q) => (
          <Link key={q.slug} href={`/documentation/${q.slug}/`} className="docs-quicklink-card">
            <h3>{q.title}</h3>
            <p>{q.description}</p>
            <span className="docs-quicklink-arrow">→</span>
          </Link>
        ))}
      </section>

      <section className="docs-category-grid">
        {groups.map((group) => (
          <div key={group.label} className="docs-category-card">
            <div className="docs-category-header">
              <svg
                className="docs-category-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: GROUP_ICON_PATHS[group.label] ?? '' }}
              />
              <h2>{group.label}</h2>
            </div>
            <ul>
              {group.docs.map((doc) => (
                <li key={doc.slug}>
                  <Link href={`/documentation/${doc.slug}/`}>{doc.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="docs-home-footer">
        <p>
          Prefer the reference API console? Interactive Swagger UI and ReDoc (self-hosted, no CDN) are
          available at <code>/docs</code> and <code>/redoc</code> on a running instance.
        </p>
        <p>
          Looking for the project overview instead?{' '}
          <a href="https://github.com/configfoundry/ConfigFoundry" target="_blank" rel="noopener noreferrer">
            View on GitHub ↗
          </a>
        </p>
      </section>
    </div>
  )
}
