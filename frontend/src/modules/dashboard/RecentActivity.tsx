'use client'

/**
 * Recent Activity -- ConfigFoundry operational widget, restyled with
 * Vuexy's real Timeline pattern (ported layout from
 * views/dashboards/crm/CrmActivityTimeline.tsx: styled MuiTimeline with
 * hidden connector-before-line, icon+title CardHeader, OptionsMenu action).
 *
 * This consolidates two items from the approved list -- "Recent Activity"
 * and "Recent Audit Logs" -- into a single widget: there is only one real
 * activity data source in this app (api.getAudit()), already used by the
 * dedicated /admin/audit-logs page (table + timeline views). Rendering two
 * separate dashboard widgets off the exact same rows would just duplicate
 * data, not add operational value, so this is a compact preview of that same
 * feed with a "View all" link to the full page.
 *
 * No fabricated avatars/photos (Vuexy's demo timeline uses stock avatar
 * images for people who don't exist here) -- each entry shows the real
 * actor/action/entity from api.getAudit(8), colored by the real action verb.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import { styled } from '@mui/material/styles'
import MuiTimeline, { type TimelineProps } from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import Icon from '@/@core/components/icon'
import OptionsMenu from '@/@core/components/option-menu'
import type { AuditEntry } from '@/lib/types'
import type { ThemeColor } from '@/@core/layouts/types'
import { useAuth } from '@/providers/AuthProvider'
import { formatActor, formatAction, formatDetails } from '@/lib/auditFormat'

const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': { display: 'none' },
  },
})

function fmtTs(ts: string | null | undefined) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function dotColor(action: string): ThemeColor {
  const a = action.toLowerCase()
  if (a.startsWith('delete')) return 'error'
  if (a.startsWith('import')) return 'info'
  if (a.startsWith('create') || a.startsWith('add')) return 'success'
  if (a.startsWith('update') || a.startsWith('edit')) return 'info'
  if (a.startsWith('generate')) return 'primary'
  return 'secondary'
}

export function RecentActivity({ entries, loading }: { entries: AuditEntry[]; loading: boolean }) {
  const { user } = useAuth()
  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', '& svg': { mr: 3 } }}>
            <Icon fontSize="1.25rem" icon="tabler:list-details" />
            <Typography>Recent Activity</Typography>
          </Box>
        }
        action={
          <OptionsMenu
            options={[{ text: 'View all audit logs', href: '/administration/audit-logs', icon: <Icon icon="tabler:arrow-right" /> }]}
            iconButtonProps={{ size: 'small', sx: { color: 'text.disabled' } }}
          />
        }
      />
      <CardContent>
        {loading ? (
          <Stack spacing={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="text" height={32} />
            ))}
          </Stack>
        ) : entries.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No activity recorded yet.
          </Typography>
        ) : (
          <Timeline>
            {entries.map((entry, i) => (
              <TimelineItem key={entry.id ?? i}>
                <TimelineSeparator>
                  <TimelineDot color={dotColor(entry.action)} sx={{ mt: 1.5 }} />
                  {i < entries.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ pt: 0, mt: 0, mb: (theme) => `${theme.spacing(2)} !important` }}>
                  <Box sx={{ mb: 0.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ mr: 2 }}>
                      {formatAction(entry.action)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {fmtTs(entry.ts)}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {formatActor(entry.actor, user?.id)}
                    {entry.entity && ` · ${entry.entity}`}
                  </Typography>
                  {formatDetails(entry.details) && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                      {formatDetails(entry.details)}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )
}
