'use client'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/common/PageHeader'
import Icon from '@/@core/components/icon'

// No integrations backend exists yet (no webhook/SSO/ticketing model in
// models/ or api.ts). Card grid is the standard Vuexy "Integrations" page
// pattern; every toggle is local-only and reports itself as not connected
// rather than pretending to enable anything.
const INTEGRATIONS = [
  { key: 'slack', name: 'Slack', desc: 'Post validation and deployment notifications to a channel.', icon: 'tabler:brand-slack' },
  { key: 'webhook', name: 'Webhooks', desc: 'Send generation events to an external HTTP endpoint.', icon: 'tabler:webhook' },
  { key: 'saml', name: 'SAML SSO', desc: 'Single sign-on via a SAML identity provider.', icon: 'tabler:key' },
  { key: 'oidc', name: 'OIDC SSO', desc: 'Single sign-on via an OpenID Connect provider.', icon: 'tabler:shield-lock' },
  { key: 'servicenow', name: 'ServiceNow', desc: 'File change tickets automatically from Findings.', icon: 'tabler:ticket' },
  { key: 'pagerduty', name: 'PagerDuty', desc: 'Page on-call when validation finds critical errors.', icon: 'tabler:bell-ringing' },
]

export default function SystemIntegrationsPage() {
  const { toast } = useToast()

  return (
    <>
      <PageHeader
        title="Integrations"
        description="None of these are connected yet -- TODO: add an Integration model + per-provider config/secret storage."
      />
      <Grid container spacing={4}>
        {INTEGRATIONS.map(i => (
          <Grid item xs={12} sm={6} md={4} key={i.key}>
            <Card variant="outlined">
              <CardHeader
                sx={{ pb: 1 }}
                avatar={<Avatar sx={{ bgcolor: 'action.selected', color: 'text.primary' }}><Icon icon={i.icon} /></Avatar>}
                title={i.name}
                action={
                  <Switch onChange={() => toast(`${i.name} isn't connected to a backend yet.`, 'error')} />
                }
              />
              <CardContent sx={{ pt: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{i.desc}</Typography>
                <Chip size="small" label="Not connected" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  )
}
