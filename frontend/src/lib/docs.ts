/**
 * Build-time data layer for the in-app documentation viewer
 * (frontend/src/app/docs/). Reads directly from the repository's docs/
 * directory (one level up from frontend/) -- there is no copy step, so
 * the in-app viewer can never drift from the docs/*.md files themselves.
 *
 * Everything here runs at `next build` time only (Node.js fs access),
 * never in the browser -- consistent with the static export / air-gap
 * requirement that the shipped frontend/out/ needs no server process.
 * See docs/airgap.md and docs/architecture.md#frontend-architecture.
 */
import fs from 'fs'
import path from 'path'
import { renderMarkdown, type Heading } from './markdown'

const DOCS_DIR = path.join(process.cwd(), '..', 'docs')

export interface DocMeta {
  slug: string
  title: string
}

export interface DocGroup {
  label: string
  docs: DocMeta[]
}

export interface DocPage {
  slug: string
  title: string
  html: string
  headings: Heading[]
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
// nav entry, or a nav entry pointing at a deleted file.
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

export function getDoc(slug: string): DocPage {
  const raw = readDocRaw(slug)
  const { html, headings } = renderMarkdown(raw)
  return { slug, title: extractTitle(raw, slug), html, headings }
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
