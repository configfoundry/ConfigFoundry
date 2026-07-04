// ---------------------------------------------------------------------------
// Minimal client-side line diff (LCS-based). No new dependency added --
// this only powers the Diff Viewer's presentation; it does not touch or
// duplicate the backend's generation/validation logic in any way. It
// diffs two already-fetched YAML strings: the just-generated file and the
// same filename from the most recent History entry (both from existing
// API calls -- api.generate() and api.getHistoryEntry()).
// ---------------------------------------------------------------------------

export interface DiffLine {
  type: 'equal' | 'add' | 'remove'
  text: string
}

const MAX_CELLS = 4_000_000 // guard against pathological O(n*m) blowup

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const n = a.length
  const m = b.length

  if (n * m > MAX_CELLS) {
    return [{ type: 'equal', text: '(file too large to diff line-by-line -- showing new version only below)' }, ...b.map((text) => ({ type: 'equal' as const, text }))]
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
      result.push({ type: 'equal', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'remove', text: a[i] })
      i++
    } else {
      result.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) {
    result.push({ type: 'remove', text: a[i] })
    i++
  }
  while (j < m) {
    result.push({ type: 'add', text: b[j] })
    j++
  }
  return result
}
