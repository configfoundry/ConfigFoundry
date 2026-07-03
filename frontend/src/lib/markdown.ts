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
 * horizontal rules -- plus three deliberate ConfigFoundry-specific
 * extensions (GitHub-style admonition callouts, a `:::tabs` block, and
 * ```mermaid fenced blocks flagged for client-side rendering) -- so a
 * focused renderer covers it completely, is trivially auditable, and
 * ships zero extra bytes beyond the one small vendored Mermaid package
 * (see docs/airgap.md for how that's vendored without a CDN).
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

const PLACEHOLDER_PREFIX = 'CFSPAN'
const PLACEHOLDER_RE = /CFSPAN(\d+)/g

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
      return { href: 'https://github.com/configfoundry/ConfigFoundry#readme', external: true }
    }
    return { href: `/documentation/${name.toLowerCase()}/${hash}`, external: false }
  }
  return { href, external: false }
}

/**
 * Renders inline Markdown (bold, italic, code spans, links) within a
 * single block of text. Code spans are pulled out first and swapped
 * back in at the end, delimited with a token that can never appear in
 * real Markdown source, so nothing inside a code span -- including
 * asterisks, brackets, or plain numbers -- is ever misinterpreted as
 * bold/italic/link syntax.
 */
function renderInline(raw: string): string {
  const codeSpans: string[] = []
  let text = raw.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`)
    return `${PLACEHOLDER_PREFIX}${codeSpans.length - 1}`
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

// ---------------------------------------------------------------------------
// Syntax highlighting -- a small regex-based tokenizer per language family.
// This is deliberately not a "real" tokenizer/parser: it's good enough for
// clean, well-formed documentation code samples, which is all docs/*.md
// contains. See the file header for why this exists instead of a library.
// ---------------------------------------------------------------------------
interface TokenRule {
  re: RegExp
  cls: string
}

function buildTokenizer(rules: TokenRule[]): (code: string) => string {
  const combined = new RegExp(rules.map((r, i) => `(?<g${i}>${r.re.source})`).join('|'), 'gm')
  return (code: string) => {
    let out = ''
    let last = 0
    let m: RegExpExecArray | null
    combined.lastIndex = 0
    while ((m = combined.exec(code))) {
      if (m.index > last) out += escapeHtml(code.slice(last, m.index))
      const groupIdx = rules.findIndex((_, i) => m!.groups?.[`g${i}`] !== undefined)
      const text = m[0]
      out += `<span class="${rules[groupIdx].cls}">${escapeHtml(text)}</span>`
      last = m.index + text.length
      if (text.length === 0) combined.lastIndex++
    }
    out += escapeHtml(code.slice(last))
    return out
  }
}

const BASH_KEYWORDS =
  '\\b(?:if|then|else|elif|fi|for|do|done|while|until|case|esac|function|local|export|return|exit|in|echo|read|set|shift|break|continue|source|trap|cd|pip|python3?|npm|node|git|sudo|chmod|mkdir|rm|cp|mv|curl|tar|make)\\b'

const TOKENIZERS: Record<string, (code: string) => string> = {
  bash: buildTokenizer([
    { re: /#.*/, cls: 'tok-comment' },
    { re: /'[^']*'|"(?:[^"\\]|\\.)*"/, cls: 'tok-string' },
    { re: /(?<=^|\s)--?[A-Za-z][\w-]*/, cls: 'tok-flag' },
    { re: /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/, cls: 'tok-variable' },
    { re: new RegExp(BASH_KEYWORDS), cls: 'tok-keyword' },
    { re: /\b\d+\b/, cls: 'tok-number' },
  ]),
  python: buildTokenizer([
    { re: /#.*/, cls: 'tok-comment' },
    { re: /@[A-Za-z_][\w.]*/, cls: 'tok-decorator' },
    { re: /'''[\s\S]*?'''|"""[\s\S]*?"""|'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"/, cls: 'tok-string' },
    {
      re: /\b(?:def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|pass|None|True|False|lambda|yield|raise|in|is|not|and|or|self|async|await|global|nonlocal|del|assert)\b/,
      cls: 'tok-keyword',
    },
    { re: /\b\d+(?:\.\d+)?\b/, cls: 'tok-number' },
  ]),
  yaml: buildTokenizer([
    { re: /#.*/, cls: 'tok-comment' },
    { re: /^\s*[A-Za-z_][\w.-]*(?=\s*:)/, cls: 'tok-key' },
    { re: /'[^']*'|"(?:[^"\\]|\\.)*"/, cls: 'tok-string' },
    { re: /\b(?:true|false|null|yes|no)\b/, cls: 'tok-keyword' },
    { re: /\b\d+(?:\.\d+)?\b/, cls: 'tok-number' },
  ]),
  json: buildTokenizer([
    { re: /"(?:[^"\\]|\\.)*"(?=\s*:)/, cls: 'tok-key' },
    { re: /"(?:[^"\\]|\\.)*"/, cls: 'tok-string' },
    { re: /\b(?:true|false|null)\b/, cls: 'tok-keyword' },
    { re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/, cls: 'tok-number' },
  ]),
  typescript: buildTokenizer([
    { re: /\/\/.*/, cls: 'tok-comment' },
    { re: /\/\*[\s\S]*?\*\//, cls: 'tok-comment' },
    { re: /`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/, cls: 'tok-string' },
    {
      re: /\b(?:import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|new|this|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|default|as)\b/,
      cls: 'tok-keyword',
    },
    { re: /\b\d+(?:\.\d+)?\b/, cls: 'tok-number' },
  ]),
  ini: buildTokenizer([
    { re: /[#;].*/, cls: 'tok-comment' },
    { re: /^\s*\[[^\]]+\]/, cls: 'tok-key' },
    { re: /^\s*[A-Za-z_][\w.-]*(?=\s*=)/, cls: 'tok-key' },
  ]),
}
TOKENIZERS.nginx = TOKENIZERS.ini
TOKENIZERS.js = TOKENIZERS.typescript
TOKENIZERS.jsx = TOKENIZERS.typescript
TOKENIZERS.tsx = TOKENIZERS.typescript
TOKENIZERS.sh = TOKENIZERS.bash
TOKENIZERS.shell = TOKENIZERS.bash
TOKENIZERS.py = TOKENIZERS.python
TOKENIZERS.yml = TOKENIZERS.yaml

function highlightCode(code: string, lang: string): string {
  const tokenize = TOKENIZERS[lang.toLowerCase()]
  return tokenize ? tokenize(code) : escapeHtml(code)
}

// ---------------------------------------------------------------------------
// Admonition callouts -- GitHub-style ">  [!NOTE]" etc.
// ---------------------------------------------------------------------------
const CALLOUT_TYPES: Record<string, { label: string; cls: string }> = {
  NOTE: { label: 'Note', cls: 'callout-note' },
  TIP: { label: 'Tip', cls: 'callout-tip' },
  IMPORTANT: { label: 'Important', cls: 'callout-important' },
  WARNING: { label: 'Warning', cls: 'callout-warning' },
  CAUTION: { label: 'Caution', cls: 'callout-caution' },
}

const CALLOUT_ICONS: Record<string, string> = {
  NOTE: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.5" r=".5" fill="currentColor" stroke="none"/>',
  TIP: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  IMPORTANT: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.5" r=".5" fill="currentColor" stroke="none"/>',
  WARNING: '<path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="10" x2="12" y2="15"/><circle cx="12" cy="18" r=".5" fill="currentColor" stroke="none"/>',
  CAUTION: '<path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="10" x2="12" y2="15"/><circle cx="12" cy="18" r=".5" fill="currentColor" stroke="none"/>',
}

// ---------------------------------------------------------------------------
// Block rendering. Extracted into a standalone function (rather than being
// inlined into renderMarkdown) so the `:::tabs` block can recursively render
// each tab panel's body through the exact same logic as the top-level
// document, including nested code fences, lists, and callouts.
// ---------------------------------------------------------------------------
let tabsCounter = 0

function renderBlocks(lines: string[], headings: Heading[], usedIds: Set<string>): string {
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Tabs block: ::: tabs ... @tab Label ... :::
    if (/^:::\s*tabs\s*$/.test(line.trim())) {
      i++
      const tabs: { label: string; lines: string[] }[] = []
      while (i < lines.length && !/^:::\s*$/.test(lines[i].trim())) {
        const tabHeader = lines[i].match(/^@tab\s+(.+)$/)
        if (tabHeader) {
          tabs.push({ label: tabHeader[1].trim(), lines: [] })
          i++
          continue
        }
        if (tabs.length > 0) tabs[tabs.length - 1].lines.push(lines[i])
        i++
      }
      i++ // consume closing :::
      const groupId = `cf-tabs-${tabsCounter++}`
      const labels = tabs
        .map((t, idx) => `<label for="${groupId}-${idx}">${escapeHtml(t.label)}</label>`)
        .join('')
      const inputs = tabs
        .map(
          (_, idx) =>
            `<input type="radio" name="${groupId}" id="${groupId}-${idx}"${idx === 0 ? ' checked' : ''} />`
        )
        .join('')
      const panels = tabs
        .map((t) => `<div class="doc-tabs-panel">${renderBlocks(t.lines, headings, usedIds)}</div>`)
        .join('')
      out.push(
        `<div class="doc-tabs" data-tab-count="${tabs.length}">${inputs}` +
          `<div class="doc-tabs-list" role="tablist">${labels}</div>` +
          `<div class="doc-tabs-panels">${panels}</div></div>`
      )
      continue
    }

    // Fenced code block (and ```mermaid, rendered client-side)
    const fence = line.match(/^```(\S*)\s*$/)
    if (fence) {
      const lang = fence[1] || ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing fence
      const rawCode = codeLines.join('\n')

      if (lang.toLowerCase() === 'mermaid') {
        const safeSource = rawCode.replace(/<\/script/gi, '<\\/script')
        out.push(
          `<div class="mermaid-block">` +
            `<div class="mermaid-render"><div class="mermaid-loading">Rendering diagram…</div></div>` +
            `<script type="text/plain" class="mermaid-source">${safeSource}</script>` +
            `</div>`
        )
        continue
      }

      const code = highlightCode(rawCode, lang)
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

    // Blockquote -- either a plain quote or a "> [!TYPE]" admonition callout
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const calloutMatch = quoteLines[0]?.match(/^\[!(\w+)\]\s*(.*)$/)
      const calloutType = calloutMatch ? CALLOUT_TYPES[calloutMatch[1].toUpperCase()] : undefined
      if (calloutMatch && calloutType) {
        // Body lines are rendered through the full block renderer (not just
        // renderInline) so a callout can contain more than one paragraph --
        // lists, nested code fences, even another callout -- the same way a
        // :::tabs panel does above. A callout is almost always short, but
        // several docs pages (e.g. roadmap.md's "Deliberately out of scope"
        // list) read naturally as a callout wrapping a bullet list.
        const restOfFirstLine = calloutMatch[2]
        const bodyLines = [restOfFirstLine, ...quoteLines.slice(1)]
        const type = calloutMatch[1].toUpperCase()
        out.push(
          `<div class="callout ${calloutType.cls}">` +
            `<div class="callout-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CALLOUT_ICONS[type]}</svg>${calloutType.label}</div>` +
            `<div class="callout-body">${renderBlocks(bodyLines, headings, usedIds)}</div></div>`
        )
      } else {
        out.push(`<blockquote>${renderInline(quoteLines.join(' '))}</blockquote>`)
      }
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
      !/^>\s?/.test(lines[i]) &&
      !/^:::\s*tabs\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    out.push(`<p>${renderInline(paraLines.join(' '))}</p>`)
  }

  return out.join('\n')
}

export function renderMarkdown(markdown: string): RenderedDoc {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const headings: Heading[] = []
  const usedIds = new Set<string>()
  const html = renderBlocks(lines, headings, usedIds)
  return { html, headings }
}
