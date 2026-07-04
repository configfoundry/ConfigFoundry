'use client'

/**
 * Recent Imports -- ConfigFoundry operational widget slot, restyled with
 * Vuexy components (CustomAvatar + Icon + Typography inside a themed Card),
 * but still an honest empty state rather than a fabricated table.
 *
 * core/services/import_service.py does not write to the audit log today
 * (confirmed by grep -- only auth.py and the policy checks call
 * audit_repo.log()), so there is no real import history to show. Per "never
 * fabricate trends/data," this stays a labeled placeholder -- same fact as
 * the pre-migration version, just presented with the same Card/CardHeader
 * language as the rest of this dashboard instead of a plain text block.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Icon from '@/@core/components/icon'
import CustomAvatar from '@/@core/components/mui/avatar'

export function RecentImports() {
  return (
    <Card>
      <CardHeader title="Recent Imports" subheader="Inventory import activity" />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 6 }}>
        <CustomAvatar skin="light" color="secondary" sx={{ mb: 3, width: 42, height: 42 }}>
          <Icon icon="tabler:file-upload" fontSize="1.5rem" />
        </CustomAvatar>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Import events aren&apos;t recorded in the audit log yet.
        </Typography>
      </CardContent>
    </Card>
  )
}
