// ---------------------------------------------------------------------------
// Minimal client-side line diff (LCS-based). No new dependency added --
// this only powers the Diff Viewer's presentation; it does not touch or
// duplicate the backend's generation/validation logic in any way. It
// diffs two already-fetched YAML strings: the just-generated file and the
// same filename from a selected History entry (both from existing API
// calls -- api.generate() and api.getHistoryEntry()).
// ---------------------------------------------------------------------------

export interface DiffLine {
  type: 'equal' | 'add' | 'remove'
  text: string
  /** 1-based line number in the old file, absent for 'add' lines. */
  oldLine?: number
  /** 1-based line number in the new file, absent for 'remove' lines. */
  newLine?: number
}

const MAX_CELLS = 4_000_000 // guard against pathological O(n*m) blowup

/** Unified (single-column) line diff, annotated with per-side line numbers. */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const n = a.length
  const m = b.length

  if (n * m > MAX_CELLS) {
    return [
      { type: 'equal', text: '(file too large to diff line-by-line -- showing new version only below)' },
      ...b.map((text, i) => ({ type: 'equal' as const, text, oldLine: i + 1, newLine: i + 1 })),
    ]
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', text: a[i], oldLine: i + 1, newLine: j + 1 })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'remove', text: a[i], oldLine: i + 1 })
      i++
    } else {
      result.push({ type: 'add', text: b[j], newLine: j + 1 })
      j++
    }
  }
  while (i < n) {
    result.push({ type: 'remove', text: a[i], oldLine: i + 1 })
    i++
  }
  while (j < m) {
    result.push({ type: 'add', text: b[j], newLine: j + 1 })
    j++
  }
  return result
}

export interface SideBySideCell {
  text: string
  line: number | null
  type: 'equal' | 'add' | 'remove' | 'empty'
}

export interface SideBySideRow {
  left: SideBySideCell
  right: SideBySideCell
}

/**
 * Pairs the flat LCS diff into aligned left/right rows for a split view --
 * consecutive remove/add blocks are lined up row-by-row, padding the
 * shorter side with an empty cell so both panes have identical row counts
 * (required for the two panes to stay aligned under synced scrolling).
 */
export function computeSideBySideDiff(oldText: string, newText: string): SideBySideRow[] {
  const flat = computeLineDiff(oldText, newText)
  const rows: SideBySideRow[] = []
  let i = 0
  while (i < flat.length) {
    const item = flat[i]
    if (item.type === 'equal') {
      rows.push({
        left: { text: item.text, line: item.oldLine ?? null, type: 'equal' },
        right: { text: item.text, line: item.newLine ?? null, type: 'equal' },
      })
      i++
      continue
    }
    const removes: DiffLine[] = []
    while (i < flat.length && flat[i].type === 'remove') {
      removes.push(flat[i])
      i++
    }
    const adds: DiffLine[] = []
    while (i < flat.length && flat[i].type === 'add') {
      adds.push(flat[i])
      i++
    }
    const max = Math.max(removes.length, adds.length)
    for (let k = 0; k < max; k++) {
      const l = removes[k]
      const r = adds[k]
      rows.push({
        left: l ? { text: l.text, line: l.oldLine ?? null, type: 'remove' } : { text: '', line: null, type: 'empty' },
        right: r ? { text: r.text, line: r.newLine ?? null, type: 'add' } : { text: '', line: null, type: 'empty' },
      })
    }
  }
  return rows
}

export type DisplayRow<T> = { kind: 'line'; item: T } | { kind: 'collapsed'; blockId: number; items: T[] }

/**
 * Collapses long runs of unchanged lines down to a "Show N unchanged
 * lines" placeholder, keeping `context` lines of surrounding context --
 * standard GitHub-style diff collapsing, so a change buried in a
 * thousand-line config doesn't require scrolling past everything else.
 */
export function collapseUnchanged<T>(items: T[], isUnchanged: (item: T) => boolean, context = 3): DisplayRow<T>[] {
  const rows: DisplayRow<T>[] = []
  let i = 0
  let blockId = 0
  while (i < items.length) {
    if (!isUnchanged(items[i])) {
      rows.push({ kind: 'line', item: items[i] })
      i++
      continue
    }
    let j = i
    while (j < items.length && isUnchanged(items[j])) j++
    const runLength = j - i
    if (runLength <= context * 2 + 1) {
      for (let k = i; k < j; k++) rows.push({ kind: 'line', item: items[k] })
    } else {
      for (let k = i; k < i + context; k++) rows.push({ kind: 'line', item: items[k] })
      rows.push({ kind: 'collapsed', blockId: blockId++, items: items.slice(i + context, j - context) })
      for (let k = j - context; k < j; k++) rows.push({ kind: 'line', item: items[k] })
    }
    i = j
  }
  return rows
}
