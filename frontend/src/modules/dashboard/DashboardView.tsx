'use client'

/**
 * Dashboard module view -- redesigned around ConfigFoundry's own operational
 * workflow (Inventory -> Validation -> Configuration) rather than a generic
 * analytics-dashboard template, per explicit design feedback that the
 * previous version "still feels sparse and generic... technically correct
 * but not visually compelling."
 *
 * Structure (top to bottom), designed to answer "how many devices do I
 * have / is my inventory healthy / is validation passing / how many configs
 * generated / what happened recently / what should I do next" within the
 * first screenful, the way a Datadog/Grafana/Azure Portal ops overview does:
 *
 *   1. DashboardKpiRow    -- 5 compact, clickable stat tiles (Devices,
 *                            Bandwidth Rows, Subnets, Configs Generated,
 *                            Validation Passing %). Answers the "how many /
 *                            is it passing" questions in under a second.
 *   2. InventoryHealthPanel + InventorySummary -- side by side. Health panel
 *                            (titled "Infrastructure Health" to match the
 *                            Infrastructure nav rename) answers "is my
 *                            infrastructure healthy" with one consistent
 *                            Passed/Warnings/Failed classification (see
 *                            deviceMeta.validationStatus, shared with the
 *                            KPI row so the two never show conflicting
 *                            numbers -- they used to, as two separate cards
 *                            computing overlapping stats). Summary answers
 *                            "what does my infrastructure look like" via
 *                            the one thing it uniquely adds: a breakdown by
 *                            Config Type.
 *   3. ConfigurationStatus -- a dedicated "is the Configuration pipeline
 *                            healthy" summary (last run, who ran it, total
 *                            generated), distinct from the bare count in
 *                            the KPI row above -- the explicit ask was for
 *                            Infrastructure/Validation/Configuration status
 *                            to each get their own answer, not just
 *                            Infrastructure.
 *   4. Recent Activity + Quick Actions -- "what happened recently" / "what
 *                            should I do next."
 *
 * Removed from the previous version: Inventory Overview (exact duplicate of
 * Inventory Summary's old stat rows), Device Health + Validation Health as
 * two separate cards (merged into InventoryHealthPanel, one classification
 * instead of two disagreeing ones), Configurations Generated as a
 * standalone card (now a KPI tile), Recent Exports (a full DataGrid
 * showing the exact same /history rows already visible in Recent Activity
 * and on the dedicated Generated Configurations page -- three views of one
 * feed was redundancy, not information), Recent Imports (a card that always
 * rendered "import events aren't recorded in the audit log" even after
 * live-testing showed the backend DOES log import_devices/import_bandwidth
 * -- Recent Activity already surfaces those entries, so this folds in
 * rather than duplicating with stale copy).
 *
 * Business logic unchanged: same 4 queries as before (api.getMeta(),
 * api.getDevices(), api.getHistory(), api.getAudit()), just a larger
 * history limit (50 instead of 5) so the "Configs Generated" KPI reflects
 * more than the last 5 runs -- the previous 5-row cap meant that stat was
 * already silently wrong for any instance with more than 5 real runs.
 */
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { api } from '@/lib/api'
import ApexChartWrapper from '@/@core/styles/libs/react-apexcharts'
import { validationStatus } from '@/modules/inventory/deviceMeta'
import { DashboardKpiRow } from './DashboardKpiRow'
import { InventoryHealthPanel } from './InventoryHealthPanel'
import { InventorySummary } from './InventorySummary'
import { ConfigurationStatus } from './ConfigurationStatus'
import { RecentActivity } from './RecentActivity'
import { QuickActions } from './QuickActions'
import { DashboardOnboarding } from './DashboardOnboarding'

export function DashboardView() {
  const { data: meta, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
  })
  const { data: devicesRes, isLoading: devLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.getDevices() })
  const { data: historyRes, isLoading: historyLoading } = useQuery({ queryKey: ['history', 50], queryFn: () => api.getHistory(50) })
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

  const isEmptyInventory = !metaLoading && !!meta && meta.deviceCount === 0 && meta.bandwidthCount === 0 && meta.subnetCount === 0
  const { total: validatedTotal, passPct } = validationStatus(devices)

  return (
    <ApexChartWrapper>
      <Stack spacing={6}>
        {isEmptyInventory ? (
          <DashboardOnboarding hasHistory={historyEntries.length > 0} />
        ) : (
          <>
            <DashboardKpiRow
              deviceCount={meta?.deviceCount ?? 0}
              bandwidthCount={meta?.bandwidthCount ?? 0}
              subnetCount={meta?.subnetCount ?? 0}
              configsGenerated={historyEntries.length}
              validationPassPct={validatedTotal === 0 ? null : passPct}
              loading={metaLoading || historyLoading}
            />
            <Grid container spacing={6} alignItems="stretch">
              <Grid item xs={12} lg={7}>
                <InventoryHealthPanel devices={devices} loading={devLoading} />
              </Grid>
              <Grid item xs={12} lg={5}>
                <InventorySummary devices={devices} loading={devLoading} />
              </Grid>
            </Grid>
            <ConfigurationStatus entries={historyEntries} loading={historyLoading} />
          </>
        )}

        <Grid container spacing={6}>
          <Grid item xs={12} lg={8}>
            <RecentActivity entries={auditEntries} loading={auditLoading} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <QuickActions />
          </Grid>
        </Grid>
      </Stack>
    </ApexChartWrapper>
  )
}
