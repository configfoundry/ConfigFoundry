'use client'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import type { Finding } from '@/lib/types'
import { SEVERITY_META } from './findingGroups'

interface FindingDetailDialogProps {
  finding: Finding | null
  onClose: () => void
}

/** Read-only detail view for a single finding -- same data, just not truncated. */
export function FindingDetailDialog({ finding, onClose }: FindingDetailDialogProps) {
  if (!finding) return null
  const meta = SEVERITY_META[finding.severity]

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={meta.label.replace(/s$/, '')} color={meta.color} size="small" />
          {finding.code && <Chip label={finding.code} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {finding.message}
        </Typography>
        {finding.category && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Category: {finding.category}
          </Typography>
        )}
        {(finding.device || finding.deviceId) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Device:{' '}
            <Link href="/inventory/devices" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {finding.device ?? finding.deviceId}
            </Link>
            {finding.field && ` · field: ${finding.field}`}
          </Typography>
        )}
        {finding.details && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {finding.details}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
