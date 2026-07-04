'use client'

import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Link from 'next/link'
import type { Finding } from '@/lib/types'
import { SEVERITY_META } from './findingGroups'

interface FindingsTimelineProps {
  findings: Finding[]
  onSelect: (f: Finding) => void
}

export function FindingsTimeline({ findings, onSelect }: FindingsTimelineProps) {
  return (
    <Timeline sx={{ p: 0, m: 0, '& .MuiTimelineItem-root:before': { flex: 0, padding: 0 } }}>
      {findings.map((f, i) => {
        const meta = SEVERITY_META[f.severity]
        return (
          <TimelineItem key={i}>
            <TimelineOppositeContent sx={{ flex: 0.15, minWidth: 90, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {f.code ?? '—'}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={meta.color} variant="outlined" />
              {i < findings.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent sx={{ pb: 2.5 }}>
              <Typography variant="body2">{f.message}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {(f.device || f.deviceId) && (
                  <Typography variant="caption" color="text.secondary">
                    Device:{' '}
                    <Link href="/inventory/devices" style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {f.device ?? f.deviceId}
                    </Link>
                  </Typography>
                )}
                <Button size="small" onClick={() => onSelect(f)} sx={{ minWidth: 0, py: 0 }}>
                  View details
                </Button>
              </Box>
            </TimelineContent>
          </TimelineItem>
        )
      })}
    </Timeline>
  )
}
