/**
 * Build-time data layer for the in-app documentation viewer
 * (frontend/src/app/documentation/). Reads directly from the
 * repository's docs/ directory (one level up from frontend/) -- there
 * is no copy step, so the in-app viewer can never drift from the
 * docs/*.md files themselves.
 *
 * docs/ is organized into topic subdirectories (docs/architecture/,
 * docs/api/, docs/security/, ...) as of the documentation reorganization
 * -- see docs/adr for context. Slugs are POSIX relative paths from
 * docs/ without the .md extension (e.g. "architecture/architecture",
 * "adr/ADR-0001 - SQLite Default with StorageProvider Abstraction"), and
 * flow straight through into the URL via the [...slug] catch-all route
 * (frontend/src/app/documentation/[...slug]/page.tsx) -- a slug
 * containing "/" simply becomes a multi-segment URL.
 *
 * docs/internal/ is excluded entirely from this module -- it holds
 * non-public planning/business/archive material (see docs/internal's own
 * docs, none of which are listed below) and must never appear in the
 * public docs viewer or its search index.
 *
 * Nav grouping is directory-driven (one group per top-level docs/
 * subfolder, see GROUP_LABELS below) rather than a hand-maintained file
 * list, specifically so new docs added under an existing category appear
 * automatically without an app-code change -- the previous flat-file
 * design required a NAV_GROUPS edit for every new doc, which doesn't
 * scale as the docs tree grows. The strict "fail loudly on drift" property
 * is preserved: an unrecognized top-level folder, or a recognized one
 * with zero files, still throws at build time.
 *
 * Everything here runs at `next build` time only (Node.js fs/child_process
 * access), never in the browser -- consistent with the static export /
 * air-gap requirement that the shipped frontend/out/ needs no server
 * process. See docs/deployment/airgap.md and docs/architecture/architecture.md#frontend-architecture.
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { renderMarkdown, type Heading } from './markdown'

const DOCS_DIR = path.join(process.cwd(), '..', 'docs')
const REPO_ROOT = path.join(process.cwd(), '..')
const INTERNAL_DIR_NAME = 'internal'

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

// One nav group per top-level docs/ subdirectory, in display order.
// "internal" is deliberately absent -- see module docstring.
const GROUP_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  architecture: 'Architecture',
  adr: 'Architecture Decisions',
  api: 'API',
  security: 'Security',
  development: 'Development',
  deployment: 'Deployment',
  integrations: 'Integrations',
  roadmap: 'Roadmap',
  reference: 'Reference',
}
const GROUP_ORDER = Object.keys(GROUP_LABELS)

function readDocRaw(slug: string): string {
  const file = path.join(DOCS_DIR, `${slug}.md`)
  return fs.readFileSync(file, 'utf-8')
}

/** Recursively collect POSIX-relative "<sub>/.../name" slugs (no .md) for
 * every markdown file under `dir` (a path relative to DOCS_DIR). */
function collectSlugs(dir: string): string[] {
  const abs = path.join(DOCS_DIR, dir)
  const out: string[] = []
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...collectSlugs(rel))
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      out.push(rel.replace(/\.md$/i, ''))
    }
  }
  return out
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
  const topLevel = fs.readdirSync(DOCS_DIR, { withFileTypes: true })
  const slugs: string[] = []
  for (const entry of topLevel) {
    if (entry.isDirectory()) {
      if (entry.name === INTERNAL_DIR_NAME) continue // never public
      slugs.push(...collectSlugs(entry.name))
    } else if (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md') {
      slugs.push(entry.name.replace(/\.md$/i, ''))
    }
  }
  return slugs.sort()
}

let cachedGroups: DocGroup[] | null = null

export function getAllDocsMeta(): DocGroup[] {
  if (cachedGroups) return cachedGroups

  const topLevel = fs.readdirSync(DOCS_DIR, { withFileTypes: true })
  const unexpectedDirs = topLevel
    .filter((e) => e.isDirectory() && e.name !== INTERNAL_DIR_NAME && !(e.name in GROUP_LABELS))
    .map((e) => e.name)
  if (unexpectedDirs.length > 0) {
    throw new Error(
      `docs/ contains subdirector${unexpectedDirs.length === 1 ? 'y' : 'ies'} not listed in GROUP_LABELS: ` +
        `${unexpectedDirs.join(', ')}. Add ${unexpectedDirs.length === 1 ? 'it' : 'them'} to GROUP_LABELS in ` +
        `frontend/src/lib/docs.ts (or move the folder under docs/internal/ if it isn't meant to be public).`
    )
  }

  const groups: DocGroup[] = GROUP_ORDER.map((dir) => {
    if (!fs.existsSync(path.join(DOCS_DIR, dir))) {
      throw new Error(
        `GROUP_LABELS in frontend/src/lib/docs.ts references "docs/${dir}/" but that directory does not exist.`
      )
    }
    const slugs = collectSlugs(dir).sort()
    if (slugs.length === 0) {
      throw new Error(`"docs/${dir}/" exists but contains no markdown files.`)
    }
    return {
      label: GROUP_LABELS[dir],
      docs: slugs.map((slug) => ({ slug, title: extractTitle(readDocRaw(slug), slug) })),
    }
  })

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

/** The directory portion of a slug within docs/ (e.g. "architecture/architecture" -> "architecture"). */
function dirOfSlug(slug: string): string {
  const idx = slug.lastIndexOf('/')
  return idx === -1 ? '' : slug.slice(0, idx)
}

export function getDoc(slug: string): DocPage {
  const raw = readDocRaw(slug)
  const { html, headings } = renderMarkdown(raw, dirOfSlug(slug))
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
      const { headings } = renderMarkdown(raw, dirOfSlug(doc.slug))
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
