'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import { PageHeader } from '@/components/common/PageHeader'
import Icon from '@/@core/components/icon'

// No license/entitlement model exists in the backend (checked models/,
// api.ts). ConfigFoundry ships open-source with no license tiers today, so
// this page presents that plainly instead of fabricating a plan/seat count.
export default function SystemLicensingPage() {
  return (
    <>
      <PageHeader
        title="Licensing"
        description="TODO: once a licensing model exists, wire this to GET /api/v1/system/license. ConfigFoundry currently ships without license enforcement."
      />
      <Card>
        <CardContent>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="text.secondary">Edition</Typography>
              <Typography variant="h6">Community (Unlicensed)</Typography>
              <Chip size="small" label="No expiration" color="success" variant="outlined" sx={{ mt: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="text.secondary">Seats</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Unlimited (no seat enforcement)</Typography>
              <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 4 }} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 4 }} />
          <Button variant="outlined" startIcon={<Icon icon="tabler:upload" />} disabled>
            Upload License Key
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
