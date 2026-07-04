'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/ui/Toast'
import Icon from '@/@core/components/icon'

// No per-user notification-preference model exists in the backend (checked
// models/, api.ts) -- the in-app notification dropdown is already real
// (audit-log-backed, see @core/layouts/components/shared-components/
// NotificationDropdown.tsx), but which events reach it isn't user-
// configurable server-side yet. Local-only toggles, honest about it.
const PREFS = [
  { key: 'validationComplete', label: 'Validation run completed', desc: 'When Run Validation finishes.' },
  { key: 'generationComplete', label: 'Configuration generated', desc: 'When Generate Configuration finishes.' },
  { key: 'criticalFindings', label: 'Critical findings detected', desc: 'When a validation run has error-severity findings.' },
  { key: 'userAdminChanges', label: 'User & role changes', desc: 'When users, roles, or API keys are created or removed.' },
  { key: 'emailDigest', label: 'Weekly email digest', desc: 'Summary of activity, sent by email.' },
]

export default function AccountNotificationsPage() {
  const { toast } = useToast()

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Not yet connected to a backend -- TODO: add a per-user notification-preferences endpoint."
        action={<Chip size="small" variant="outlined" color="warning" icon={<Icon icon="tabler:alert-triangle" fontSize="0.9rem" />} label="Not connected" />}
      />
      <Card>
        <CardContent>
          <Stack spacing={3} divider={<Divider flexItem />}>
            {PREFS.map(p => (
              <Box key={p.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>{p.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.desc}</Typography>
                </Box>
                <Switch defaultChecked onChange={() => toast('Notification preferences aren’t connected to a backend yet.', 'error')} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </>
  )
}
