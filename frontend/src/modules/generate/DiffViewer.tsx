'use client'

import { useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined'
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined'
import UnfoldMoreOutlinedIcon from '@mui/icons-material/UnfoldMoreOutlined'
import {
  computeLineDiff,
  computeSideBySideDiff,
  collapseUnchanged,
  type DiffLine,
  type SideBySideRow,
} from './lineDiff'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  maxHeight?: number
}

// GitHub-diff-style palette: a tinted row background + a solid left accent
// bar + a bold colored "+"/"-" in a dedicated gutter column. This is the
// visual language most people recognize as "a diff" (PR review UIs,
// `git diff` with --color, etc.) -- plain faint highlighting without the
// gutter marker or accent bar reads as "some rows are shaded", not "diff".
const ROW_STYLE: Record<'equal' | 'add' | 'remove' | 'empty', { bg: string; accent: string; marker: string; markerColor: string }> = {
  equal: { bg: 'transparent', accent: 'transparent', marker: ' ', markerColor: 'text.disabled' },
  add: { bg: 'rgba(46, 160, 67, 0.15)', accent: '#2ea043', marker: '+', markerColor: 'success.main' },
  remove: { bg: 'rgba(248, 81, 73, 0.15)', accent: '#f85149', marker: '-', markerColor: 'error.main' },
  empty: { bg: 'action.hover', accent: 'transparent', marker: ' ', markerColor: 'text.disabled' },
}

const LINE_NO_SX = {
  width: 38,
  flexShrink: 0,
  userSelect: 'none' as const,
  textAlign: 'right' as const,
  pr: 1,
  color: 'text.disabled',
}

const MARKER_SX = {
  width: 18,
  flexShrink: 0,
  textAlign: 'center' as const,
  userSelect: 'none' as const,
  fontWeight: 700,
}

/** git-style unified-diff hunk header, e.g. "@@ -12,6 +12,6 @@". */
function hunkHeader(items: DiffLine[]): string {
  const first = items[0]
  const last = items[items.length - 1]
  const oldStart = first?.oldLine ?? first?.newLine ?? 0
  const newStart = first?.newLine ?? first?.oldLine ?? 0
  const count = items.length
  return `@@ -${oldStart},${count} +${newStart},${count} @@`
}

function ExpandRow({ label, onExpand }: { label: string; onExpand: () => void }) {
  return (
    <Box
      onClick={onExpand}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        bgcolor: 'info.main',
        color: 'info.contrastText',
        opacity: 0.85,
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 600,
        '&:hover': { opacity: 1 },
      }}
    >
      <UnfoldMoreOutlinedIcon sx={{ fontSize: 14 }} />
      {label}
    </Box>
  )
}

/** Diffs the just-generated file against the same filename from a selected History entry. */
export function DiffViewer({ oldContent, newContent, oldLabel = 'previous run', maxHeight = 420 }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [syncScroll, setSyncScroll] = useState(true)
  const [expandedUnified, setExpandedUnified] = useState<Set<number>>(new Set())
  const [expandedSplit, setExpandedSplit] = useState<Set<number>>(new Set())

  const flatLines = useMemo(() => computeLineDiff(oldContent, newContent), [oldContent, newContent])
  const sideBySideRows = useMemo(() => computeSideBySideDiff(oldContent, newContent), [oldContent, newContent])

  const added = flatLines.filter((l) => l.type === 'add').length
  const removed = flatLines.filter((l) => l.type === 'remove').length
  const hasChanges = added > 0 || removed > 0
  const changeBlocks = Math.max(added, removed, 1)
  const addRatio = added / (added + removed || 1)

  const unifiedDisplay = useMemo(
    () => collapseUnchanged(flatLines, (l) => l.type === 'equal'),
    [flatLines],
  )
  const splitDisplay = useMemo(
    () => collapseUnchanged(sideBySideRows, (r) => r.left.type === 'equal' && r.right.type === 'equal'),
    [sideBySideRows],
  )

  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  function syncFrom(source: 'left' | 'right') {
    return (e: React.UIEvent<HTMLDivElement>) => {
      if (!syncScroll) return
      if (syncingRef.current) {
        syncingRef.current = false
        return
      }
      const dst = source === 'left' ? rightPaneRef.current : leftPaneRef.current
      if (dst) {
        syncingRef.current = true
        dst.scrollTop = e.currentTarget.scrollTop
      }
    }
  }

  function renderUnifiedLine(l: DiffLine, key: number) {
    const s = ROW_STYLE[l.type]
    return (
      <Box key={key} sx={{ display: 'flex', bgcolor: s.bg, whiteSpace: 'pre', borderLeft: `3px solid ${s.accent}` }}>
        <Box component="span" sx={LINE_NO_SX}>{l.oldLine ?? ''}</Box>
        <Box component="span" sx={LINE_NO_SX}>{l.newLine ?? ''}</Box>
        <Box component="span" sx={{ ...MARKER_SX, color: s.markerColor }}>{s.marker}</Box>
        <Box component="span" sx={{ color: 'text.primary' }}>{l.text || ' '}</Box>
      </Box>
    )
  }

  function renderSplitCell(cell: SideBySideRow['left'] | SideBySideRow['right']) {
    const s = ROW_STYLE[cell.type]
    return (
      <Box sx={{ display: 'flex', bgcolor: s.bg, whiteSpace: 'pre', flex: 1, minWidth: 0, borderLeft: `3px solid ${s.accent}` }}>
        <Box component="span" sx={LINE_NO_SX}>{cell.line ?? ''}</Box>
        <Box component="span" sx={{ ...MARKER_SX, color: s.markerColor }}>{cell.type !== 'empty' ? s.marker : ''}</Box>
        <Box component="span" sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cell.type !== 'empty' ? cell.text || ' ' : ''}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            diff vs {oldLabel}
          </Typography>
          {hasChanges ? (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontFamily: 'monospace' }}>
                +{added}
              </Typography>
              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, fontFamily: 'monospace' }}>
                -{removed}
              </Typography>
              {/* GitHub-style diffstat mini-bar: green/red blocks proportional to add/remove */}
              <Stack direction="row" spacing={0.25} sx={{ ml: 0.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: 0.25,
                      bgcolor: i < Math.round(addRatio * 5) ? 'success.main' : 'error.main',
                      opacity: changeBlocks > 0 ? 1 : 0.3,
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">no changes</Typography>
          )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          {viewMode === 'split' && (
            <FormControlLabel
              sx={{ mr: 0 }}
              control={<Switch size="small" checked={syncScroll} onChange={(e) => setSyncScroll(e.target.checked)} />}
              label={<Typography variant="caption">Sync scroll</Typography>}
            />
          )}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={viewMode}
            onChange={(_e, v) => v && setViewMode(v)}
          >
            <ToggleButton value="unified" sx={{ py: 0.25, px: 1 }}>
              <Tooltip title="Unified view">
                <ViewStreamOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="split" sx={{ py: 0.25, px: 1 }}>
              <Tooltip title="Split view (side by side)">
                <ViewColumnOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {viewMode === 'unified' ? (
        <Box
          component="pre"
          sx={{ m: 0, p: 0, maxHeight, overflow: 'auto', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6 }}
        >
          {unifiedDisplay.map((row, i) =>
            row.kind === 'line' ? (
              renderUnifiedLine(row.item, i)
            ) : expandedUnified.has(row.blockId) ? (
              row.items.map((item, k) => renderUnifiedLine(item, i * 1000 + k))
            ) : (
              <ExpandRow
                key={i}
                label={`${hunkHeader(row.items)} ${row.items.length} unchanged line${row.items.length !== 1 ? 's' : ''}`}
                onExpand={() => setExpandedUnified((s) => new Set(s).add(row.blockId))}
              />
            ),
          )}
        </Box>
      ) : (
        <Stack direction="row" divider={<Box sx={{ width: '1px', bgcolor: 'divider' }} />}>
          {(['left', 'right'] as const).map((side) => (
            <Box
              key={side}
              ref={side === 'left' ? leftPaneRef : rightPaneRef}
              onScroll={syncFrom(side)}
              sx={{
                flex: 1,
                minWidth: 0,
                maxHeight,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 12.5,
                lineHeight: 1.6,
              }}
            >
              {splitDisplay.map((row, i) =>
                row.kind === 'line' ? (
                  <Box key={i}>{renderSplitCell(row.item[side])}</Box>
                ) : expandedSplit.has(row.blockId) ? (
                  row.items.map((item, k) => <Box key={k}>{renderSplitCell(item[side])}</Box>)
                ) : (
                  <ExpandRow
                    key={i}
                    label={`${row.items.length} unchanged`}
                    onExpand={() => setExpandedSplit((s) => new Set(s).add(row.blockId))}
                  />
                ),
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}
