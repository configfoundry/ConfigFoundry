/**
 * A small, dependency-free Markdown-to-HTML renderer purpose-built for
 * ConfigFoundry's own docs/ content.
 *
 * Why not a library: pulling in a markdown package (and, for syntax
 * highlighting, usually a second one) means vendoring it into the
 * offline npm bundle and keeping it air-gap-clean forever after (see
 * docs/airgap.md). Our docs/ corpus uses a small, consistent subset of
 * Markdown -- headings, paragraphs, fenced code blocks, tables, lists
 * (including GFM task lists), links, bold/italic, blockquotes, and
 * horizontal rules -- so a focused renderer covers it completely, is
 * trivially auditable, and ships zero extra bytes.
 *
 * Heading anchor IDs are generated with the same algorithm GitHub uses
 * (lowercase, strip everything but [a-z0-9 _-], turn spaces into
 * hyphens, de-duplicate with -1/-2/...) so every "#anchor" cross-link
 * written across docs/*.md resolves correctly without needing to hand
 * -verify each one against a different slugger.
 */

export interface Heading {
  id: string
  text: string
  level: number
}

export interface RenderedDoc {
  html: string
  headings: Heading[]
}

const PLACEHOLDER_PREFIX = 'CFSPAN'
const PLACEHOLDER_RE = /CFSPAN(\d+)/g

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function rewriteHref(hrefRaw: string): { href: string; external: boolean } {
  const href = hrefRaw.trim()
  if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
    return { href, external: true }
  }
  const mdMatch = href.match(/^(?:\.\.?\/)?([\w.-]+)\.md(#.*)?$/i)
  if (mdMatch) {
    const [, name, hash = ''] = mdMatch
    if (name.toLowerCase() === 'readme') {
      return { href: 'https://github.com/shivamsancc/ConfigFoundry#readme', external: true }
    }
    return { href: `/docs/${name.toLowerCase()}/${hash}`, external: false }
  }
  return { href, external: false }
}

/**
 * Renders inline Markdown (bold, italic, code spans, links) within a
 * single block of text. Code spans are pulled out first and swapped
 * back in at the end, delimited with U+E000 (a Unicode Private Use Area
 * code point that can never appear in real Markdown source), so nothing
 * inside a code span -- including asterisks, brackets, or plain numbers
 * -- is ever misinterpreted as bold/italic/link syntax.
 */
function renderInline(raw: string): string {
  const codeSpans: string[] = []
  let text = raw.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`)
    return `${PLACEHOLDER_PREFIX}${codeSpans.length - 1}`
  })

  text = escapeHtml(text)

  // Links: [text](href)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, hrefRaw: string) => {
    const { href, external } = rewriteHref(hrefRaw)
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${escapeHtml(href)}"${attrs}>${label}</a>`
  })

  // Bold, then italic (order matters -- bold consumes ** first).
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')

  // Restore protected code spans.
  text = text.replace(PLACEHOLDER_RE, (_m, i: string) => codeSpans[Number(i)])

  return text
}

function slugify(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9 _-]/g, '')
      .replace(/ /g, '-') || 'section'
  let id = base
  let n = 1
  while (used.has(id)) {
    id = `${base}-${n++}`
  }
  used.add(id)
  return id
}

function splitTableRow(line: string): string[] {
  let l = line.trim()
  if (l.startsWith('|')) l = l.slice(1)
  if (l.endsWith('|')) l = l.slice(0, -1)
  return l.split('|').map((c) => c.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

export function renderMarkdown(markdown: string): RenderedDoc {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const headings: Heading[] = []
  const usedIds = new Set<string>()
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1] || ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing fence
      const code = escapeHtml(codeLines.join('\n'))
      out.push(
        `<div class="code-block">` +
          `<div class="code-block-header"><span class="code-lang">${lang || 'text'}</span>` +
          `<button type="button" class="copy-btn" aria-label="Copy code">Copy</button></div>` +
          `<pre><code class="language-${lang}">${code}</code></pre></div>`
      )
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      out.push('<hr />')
      i++
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      const id = slugify(text.replace(/[`*]/g, ''), usedIds)
      if (level >= 2 && level <= 3) {
        headings.push({ id, text: text.replace(/[`*]/g, ''), level })
      }
      out.push(
        `<h${level} id="${id}">${renderInline(text)}` +
          `<a href="#${id}" class="heading-anchor" aria-label="Link to this section">#</a></h${level}>`
      )
      i++
      continue
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      const thead = `<thead><tr>${header.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`
      out.push(`<div class="table-wrap"><table class="docs-table">${thead}${tbody}</table></div>`)
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${renderInline(quoteLines.join(' '))}</blockquote>`)
      continue
    }

    // List (unordered / ordered / GFM task list) -- single level
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)!
        const content = m[1]
        const task = content.match(/^\[([ xX])\]\s+(.*)$/)
        if (task) {
          const checked = task[1].toLowerCase() === 'x'
          items.push(
            `<li class="task-item"><input type="checkbox" disabled${checked ? ' checked' : ''} /> ${renderInline(task[2])}</li>`
          )
        } else {
          items.push(`<li>${renderInline(content)}</li>`)
        }
        i++
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    // Paragraph -- collect consecutive plain lines
    const paraLines = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^-{3,}$/.test(lines[i].trim()) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    out.push(`<p>${renderInline(paraLines.join(' '))}</p>`)
  }

  return { html: out.join('\n'), headings }
}
