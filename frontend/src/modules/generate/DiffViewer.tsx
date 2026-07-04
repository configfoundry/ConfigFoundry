'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { computeLineDiff } from './lineDiff'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  maxHeight?: number
}

const BG: Record<'equal' | 'add' | 'remove', string> = {
  equal: 'transparent',
  add: 'rgba(46, 204, 113, 0.12)',
  remove: 'rgba(234, 84, 85, 0.12)',
}

const PREFIX: Record<'equal' | 'add' | 'remove', string> = { equal: '  ', add: '+ ', remove: '- ' }

/** Diffs the just-generated file against the same filename from the most recent History entry. */
export function DiffViewer({ oldContent, newContent, oldLabel = 'previous run', maxHeight = 420 }: DiffViewerProps) {
  const lines = computeLineDiff(oldContent, newContent)
  const added = lines.filter((l) => l.type === 'add').length
  const removed = lines.filter((l) => l.type === 'remove').length

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Compared to {oldLabel}: <Box component="span" sx={{ color: 'success.main' }}>+{added}</Box>{' '}
          <Box component="span" sx={{ color: 'error.main' }}>-{removed}</Box>
        </Typography>
      </Box>
      <Box component="pre" sx={{ m: 0, p: 1.5, maxHeight, overflow: 'auto', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6 }}>
        {lines.map((l, i) => (
          <Box key={i} sx={{ bgcolor: BG[l.type], whiteSpace: 'pre', color: l.type === 'remove' ? 'error.main' : l.type === 'add' ? 'success.main' : 'text.primary' }}>
            {PREFIX[l.type]}
            {l.text || ' '}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
