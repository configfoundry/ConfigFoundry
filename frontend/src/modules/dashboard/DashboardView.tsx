'use client'

/**
 * Dashboard module view -- Vuexy Analytics Dashboard, reskinned, plus
 * ConfigFoundry's own operational widgets appended below.
 *
 * Top half: the Vuexy analytics widgets, reusing verbatim the page's Grid
 * layout/spans, ApexChartWrapper, Card/CardHeader/CardContent, OptionsMenu,
 * CustomAvatar/CustomChip, and CardStatsWithAreaChart. Not ported:
 * KeenSliderWrapper (only existed for the Website Analytics slider, which
 * isn't reused) and the five widgets with no infrastructure equivalent
 * (Sales By Countries, Monthly Campaign State, Source Visits, Total
 * Earnings, Project) -- these remain removed, not replaced with invented
 * metrics.
 *
 *   Sales Overview            (xs=12 sm=6 lg=3) -> Device Health
 *   Revenue Generated         (xs=12 sm=6 lg=3) -> Configurations Generated
 *   Earning Reports           (xs=12 lg=6)      -> Inventory Summary
 *   Support Tracker           (xs=12)           -> Validation Health
 *
 * "Inventory Overview" (formerly mapped from Website Analytics Slider) was
 * removed after live testing: it showed the exact same 3 counts
 * (Devices/Bandwidth Rows/Subnets, same icons/colors) as Inventory
 * Summary's bottom row -- a genuine duplicate card, not two distinct
 * pieces of information. Inventory Summary already carries that data plus
 * the total and config-type breakdown, so it absorbs the slot instead of
 * running two cards side by side. InventoryOverview.tsx is left in the
 * tree unused (file deletion isn't available in this environment) but is
 * no longer imported/rendered anywhere.
 *
 * Lower half (added per "keep real functionality, restyle with Vuexy"):
 * the pre-migration dashboard's operational sections, restored and restyled
 * with real Vuexy components instead of removed:
 *   Recent Activity  -- Vuexy Timeline (ported from CrmActivityTimeline.tsx),
 *                        also serves as "Recent Audit Logs" -- see
 *                        RecentActivity.tsx for why these weren't split into
 *                        two separate widgets (same underlying data).
 *   Recent Exports   -- Vuexy Data Table (MUI X DataGrid, same themed
 *                        component used by Inventory/Audit Logs).
 *   Recent Imports   -- restyled Vuexy Card; still an honest empty state,
 *                        since core/services/import_service.py doesn't
 *                        write to the audit log (no real data to show).
 *   Quick Actions    -- Vuexy Card with action buttons (same
 *                        CustomAvatar+Icon row convention used throughout
 *                        this dashboard).
 *
 * All existing API calls/query keys/business logic preserved: api.getMeta()
 * (['meta']), api.getDevices() (['devices']), api.getHistory(5)
 * (['history', 5]), api.getAudit(8) (['audit', 8]) -- the same 4 queries the
 * pre-migration DashboardView used, no new endpoints.
 */
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { api } from '@/lib/api'
import ApexChartWrapper from '@/@core/styles/libs/react-apexcharts'
import { DeviceHealth } from './DeviceHealth'
import { ConfigurationsGenerated } from './ConfigurationsGenerated'
import { InventorySummary } from './InventorySummary'
import { ValidationHealth } from './ValidationHealth'
import { RecentActivity } from './RecentActivity'
import { RecentExports } from './RecentExports'
import { RecentImports } from './RecentImports'
import { QuickActions } from './QuickActions'
import { DashboardOnboarding } from './DashboardOnboarding'

export function DashboardView() {
  const { data: meta, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
  })
  const { data: devicesRes, isLoading: devLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.getDevices() })
  const { data: historyRes, isLoading: historyLoading } = useQuery({ queryKey: ['history', 5], queryFn: () => api.getHistory(5) })
  const { data: auditRes, isLoading: auditLoading } = useQuery({ queryKey: ['audit', 8], queryFn: () => api.getAudit(8) })

  if (metaError) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetchMeta()}>Retry</Button>}>
        {(metaError as Error).message || 'Failed to load dashboard data.'}
      </Alert>
    )
  }

  const devices = devicesRes?.devices ?? []
  const historyEntries = historyRes?.entries ?? []
  const auditEntries = auditRes?.entries ?? []

  // Totally empty instance (no devices, bandwidth rows, or subnets): the
  // 5-widget analytics grid below is meaningless with zero data (five
  // "0" cards plus an empty chart placeholder -- confirmed live). Show a
  // getting-started checklist instead. Once ANY inventory exists, the real
  // widgets take over again.
  const isEmptyInventory = !metaLoading && !!meta && meta.deviceCount === 0 && meta.bandwidthCount === 0 && meta.subnetCount === 0

  return (
    <ApexChartWrapper>
      <Stack spacing={6}>
        {isEmptyInventory ? (
          <DashboardOnboarding hasHistory={historyEntries.length > 0} />
        ) : (
          <Grid container spacing={6}>
            <Grid item xs={12} sm={6} lg={3}>
              <DeviceHealth devices={devices} loading={devLoading} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <ConfigurationsGenerated entries={historyEntries} loading={historyLoading} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <InventorySummary meta={meta} devices={devices} loading={metaLoading || devLoading} />
            </Grid>
            <Grid item xs={12}>
              <ValidationHealth devices={devices} loading={devLoading} />
            </Grid>
          </Grid>
        )}

        {/* ConfigFoundry operational widgets -- restyled with Vuexy components */}
        <Grid container spacing={6}>
          <Grid item xs={12} lg={8}>
            <RecentActivity entries={auditEntries} loading={auditLoading} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Stack spacing={6}>
              <QuickActions />
              <RecentImports />
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <RecentExports entries={historyEntries} loading={historyLoading} />
          </Grid>
        </Grid>
      </Stack>
    </ApexChartWrapper>
  )
}
