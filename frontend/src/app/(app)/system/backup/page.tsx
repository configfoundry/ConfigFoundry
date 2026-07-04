'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/common/PageHeader'
import { OnboardingEmptyState } from '@/components/common/OnboardingEmptyState'

// No backup/restore backend exists yet. install_offline.sh / alembic handle
// initial setup and migrations, but there's no snapshot-and-restore
// endpoint for ConfigFoundry's own data (checked scripts/, alembic/, api.ts).
export default function SystemBackupPage() {
  const { toast } = useToast()
  const notConnected = () => toast('Backups aren’t connected to a backend yet.', 'error')

  return (
    <>
      <PageHeader
        title="Backup & Restore"
        description="Scheduled backups and manual snapshot/restore for ConfigFoundry's database and inventory."
      />
      <Stack spacing={4}>
        <Card>
          <CardHeader title="Scheduled Backups" subheader="TODO: implement POST /api/v1/system/backups + a scheduler" />
          <Divider />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel control={<Switch />} label="Enable scheduled backups" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth size="small" label="Frequency" defaultValue="daily">
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Retention count" type="number" defaultValue={7} />
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', py: 2.5, px: 4 }}>
            <Button variant="contained" onClick={notConnected}>Save Schedule</Button>
          </CardActions>
        </Card>

        <Card>
          <OnboardingEmptyState
            icon="tabler:database-export"
            title="No snapshots yet"
            description="Snapshots you create will be listed here, with a Restore action per row once this is backed by a real endpoint."
            primaryLabel="Create Snapshot"
            primaryIcon="tabler:database-export"
            onPrimary={notConnected}
          />
        </Card>
      </Stack>
    </>
  )
}
