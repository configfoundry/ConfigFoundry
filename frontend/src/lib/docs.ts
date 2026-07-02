/**
 * Build-time data layer for the in-app documentation viewer
 * (frontend/src/app/documentation/). Reads directly from the
 * repository's docs/ directory (one level up from frontend/) -- there
 * is no copy step, so the in-app viewer can never drift from the
 * docs/*.md files themselves.
 *
 * Everything here runs at `next build` time only (Node.js fs/child_process
 * access), never in the browser -- consistent with the static export /
 * air-gap requirement that the shipped frontend/out/ needs no server
 * process. See docs/airgap.md and docs/architecture.md#frontend-architecture.
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { renderMarkdown, type Heading } from './markdown'

const DOCS_DIR = path.join(process.cwd(), '..', 'docs')
const REPO_ROOT = path.join(process.cwd(), '..')

export interface DocMeta {
  slug: string
  title: string
}

export interface DocGroup {
  label: string
  docs: DocMeta[]
}

export interface DocNavLink {
  slug: string
  title: string
}

export interface DocPage {
  slug: string
  title: string
  group: string
  html: string
  headings: Heading[]
  lastUpdated: string | null
  prev: DocNavLink | null
  next: DocNavLink | null
}

export interface SearchEntry {
  slug: string
  title: string
  group: string
  excerpt: string
  headings: string[]
}

// Curated navigation, grouped and ordered the same way as docs/index.md.
// getAllDocsMeta() below throws at build time if this list and the real
// docs/*.md files on disk ever go out of sync in either direction --
// deliberately fail loudly rather than silently ship a doc page with no
// nav entry, or a nav entry pointing at a deleted file. This same order
// drives the flattened prev/next sequence at the bottom of every page.
const NAV_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Getting Started', slugs: ['getting-started', 'installation', 'features', 'faq'] },
  { label: 'Air-Gap & Enterprise', slugs: ['airgap', 'enterprise', 'security', 'configuration', 'deployment'] },
  { label: 'Architecture & API', slugs: ['architecture', 'api', 'api-versioning'] },
  { label: 'Access Control', slugs: ['authentication', 'authorization', 'rbac'] },
  { label: 'Data & Storage', slugs: ['storage', 'storage-architecture', 'migrations', 'database-migrations'] },
  { label: 'Operations', slugs: ['logging', 'monitoring', 'upgrade', 'troubleshooting', 'release-process'] },
  { label: 'Compliance', slugs: ['compliance-soc2'] },
  { label: 'Contributing', slugs: ['development', 'contributing', 'roadmap'] },
]

function readDocRaw(slug: string): string {
  const file = path.join(DOCS_DIR, `${slug}.md`)
  return fs.readFileSync(file, 'utf-8')
}

function extractTitle(raw: string, fallbackSlug: string): string {
  const m = raw.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallbackSlug
}

function extractExcerpt(raw: string): string {
  const withoutTitle = raw.replace(/^#\s+.+$/m, '')
  const firstParagraph = withoutTitle
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .find((s) => s && !s.startsWith('#') && !s.startsWith('```') && !s.startsWith('|'))
  if (!firstParagraph) return ''
  return firstParagraph
    .replace(/[`*_#>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}

export function listDocSlugs(): string[] {
  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md') && f.toLowerCase() !== 'index.md')
    .map((f) => f.replace(/\.md$/i, '').toLowerCase())
    .sort()
}

let cachedGroups: DocGroup[] | null = null

export function getAllDocsMeta(): DocGroup[] {
  if (cachedGroups) return cachedGroups

  const onDisk = new Set(listDocSlugs())
  const groups: DocGroup[] = NAV_GROUPS.map((g) => ({
    label: g.label,
    docs: g.slugs.map((slug) => {
      if (!onDisk.has(slug)) {
        throw new Error(
          `docs viewer nav references "docs/${slug}.md" but that file does not exist. ` +
            `Fix the NAV_GROUPS list in frontend/src/lib/docs.ts or add the missing docs/${slug}.md.`
        )
      }
      onDisk.delete(slug)
      return { slug, title: extractTitle(readDocRaw(slug), slug) }
    }),
  }))

  if (onDisk.size > 0) {
    throw new Error(
      `docs/ contains file(s) not listed in the in-app docs nav: ${Array.from(onDisk)
        .map((s) => `docs/${s}.md`)
        .join(', ')}. Add them to NAV_GROUPS in frontend/src/lib/docs.ts.`
    )
  }

  cachedGroups = groups
  return groups
}

/** Flattened [group label, slug, title] sequence, in nav order -- the basis for prev/next links. */
function getFlatSequence(): { slug: string; title: string; group: string }[] {
  const flat: { slug: string; title: string; group: string }[] = []
  for (const group of getAllDocsMeta()) {
    for (const doc of group.docs) {
      flat.push({ slug: doc.slug, title: doc.title, group: group.label })
    }
  }
  return flat
}

function groupForSlug(slug: string): string {
  for (const group of getAllDocsMeta()) {
    if (group.docs.some((d) => d.slug === slug)) return group.label
  }
  return ''
}

let cachedGitAvailable: boolean | null = null

function gitAvailable(): boolean {
  if (cachedGitAvailable !== null) return cachedGitAvailable
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: REPO_ROOT, stdio: 'pipe' })
    cachedGitAvailable = true
  } catch {
    cachedGitAvailable = false
  }
  return cachedGitAvailable
}

/**
 * "Last updated" date for a doc page. Prefers the last commit that
 * touched docs/<slug>.md (accurate across clones/CI, not just this
 * machine's checkout time); falls back to the file's own mtime if git
 * isn't available or the file has no commit history yet (e.g. it was
 * just added and hasn't been committed in this working copy); returns
 * null rather than guessing if neither is available.
 */
function getLastUpdated(slug: string): string | null {
  const file = path.join(DOCS_DIR, `${slug}.md`)
  if (gitAvailable()) {
    try {
      const out = execFileSync(
        'git',
        ['log', '-1', '--format=%aI', '--', path.join('docs', `${slug}.md`)],
        { cwd: REPO_ROOT, stdio: 'pipe' }
      )
        .toString()
        .trim()
      if (out) return out
    } catch {
      // fall through to mtime
    }
  }
  try {
    return fs.statSync(file).mtime.toISOString()
  } catch {
    return null
  }
}

let cachedVersion: string | null = null

/** ConfigFoundry's current version, read once from frontend/package.json. */
export function getVersion(): string {
  if (cachedVersion) return cachedVersion
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
    cachedVersion = String(pkg.version || '0.0.0')
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}

export function getDoc(slug: string): DocPage {
  const raw = readDocRaw(slug)
  const { html, headings } = renderMarkdown(raw)
  const flat = getFlatSequence()
  const idx = flat.findIndex((d) => d.slug === slug)
  const prev = idx > 0 ? { slug: flat[idx - 1].slug, title: flat[idx - 1].title } : null
  const next = idx >= 0 && idx < flat.length - 1 ? { slug: flat[idx + 1].slug, title: flat[idx + 1].title } : null
  return {
    slug,
    title: extractTitle(raw, slug),
    group: groupForSlug(slug),
    html,
    headings,
    lastUpdated: getLastUpdated(slug),
    prev,
    next,
  }
}

export function getSearchIndex(): SearchEntry[] {
  const groups = getAllDocsMeta()
  const index: SearchEntry[] = []
  for (const group of groups) {
    for (const doc of group.docs) {
      const raw = readDocRaw(doc.slug)
      const { headings } = renderMarkdown(raw)
      index.push({
        slug: doc.slug,
        title: doc.title,
        group: group.label,
        excerpt: extractExcerpt(raw),
        headings: headings.map((h) => h.text),
      })
    }
  }
  return index
}
