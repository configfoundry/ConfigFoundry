'use client'

/**
 * Validation module -- UI-only migration of the old app/(app)/validation/page.tsx.
 *
 * Business logic, validation engine, and API calls are unchanged:
 *  - Same api.generate() call (runs core/validator.py server-side and
 *    returns { summary, findings, ... } -- see GenerateResult in lib/types).
 *  - Same query-cache invalidation on success (['meta'], ['history']).
 *  - Same severity model (error | warning | info) and same finding fields.
 *
 * Presentation-only additions:
 *  - Findings are grouped into Accordions by rule-code prefix
 *    (DEVICE_ / BW_ / SUBNET_), mirroring how core/validator.py itself
 *    organizes its checks (see that file's docstring) -- read from the
 *    existing `code` field, nothing new is computed server-side.
 *  - "Duplicate Devices" and "Bandwidth Issues" quick filters map to the
 *    real rule codes (DEVICE_DUPLICATE_IP/HOSTNAME, BW_ORPHANED/
 *    DUPLICATE_INTERFACE) that already exist in the engine.
 *  - A "Tag Validation" section is included per the brief, but core/validator.py
 *    explicitly defers tag checks (TAG_UNKNOWN_VALUE / TAG_WRONG_SCOPE --
 *    see its docstring "Rules deliberately deferred"). There is no backend
 *    data to show, so this section says so plainly instead of fabricating
 *    findings.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import { api } from '@/lib/api'
import type { GenerateResult, Finding } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'
import { FindingsTimeline } from './FindingsTimeline'
import { FindingDetailDialog } from './FindingDetailDialog'
import {
  SEVERITY_META,
  GROUP_META,
  groupFindings,
  DUPLICATE_DEVICE_CODES,
  BANDWIDTH_ISSUE_CODES,
  type GroupKey,
} from './findingGroups'

type FilterKey = '' | 'error' | 'warning' | 'info' | 'duplicates' | 'bandwidth'

function matchesFilter(f: Finding, filter: FilterKey): boolean {
  if (!filter) return true
  if (filter === 'duplicates') return DUPLICATE_DEVICE_CODES.has(f.code ?? '')
  if (filter === 'bandwidth') return BANDWIDTH_ISSUE_CODES.has(f.code ?? '')
  return f.severity === filter
}

const GROUP_ORDER: GroupKey[] = ['device', 'bandwidth', 'network', 'other']

export function ValidationView() {
  const qc = useQueryClient()
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [filter, setFilter] = useState<FilterKey>('')
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  const {
    mutate: runValidation,
    isLoading: isPending,
    error,
  } = useMutation({
    mutationFn: () => api.generate(),
    onSuccess: (res) => {
      setResult(res)
      setFilter('')
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const findings = result?.findings ?? []
  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.filter((f) => f.severity === 'warning').length
  const infos = findings.filter((f) => f.severity === 'info').length
  const duplicateCount = findings.filter((f) => DUPLICATE_DEVICE_CODES.has(f.code ?? '')).length
  const bandwidthCount = findings.filter((f) => BANDWIDTH_ISSUE_CODES.has(f.code ?? '')).length

  const filtered = findings.filter((f) => matchesFilter(f, filter))
  const grouped = groupFindings(filtered)

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Inventory Validation
              </Typography>
              {result && (
                <Typography variant="body2" color="text.secondary">
                  {result.summary}
                </Typography>
              )}
              {!result && !isPending && (
                <Typography variant="body2" color="text.secondary">
                  Run the validation engine to check your inventory for issues.
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<PlayArrowOutlinedIcon />}
              onClick={() => runValidation()}
              disabled={isPending}
            >
              {isPending ? 'Running…' : 'Run Validation'}
            </Button>
          </Stack>
          {isPending && <LinearProgress sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      {!!error && <Alert severity="error">{(error as Error).message}</Alert>}

      {!isPending && !result && !error && (
        <EmptyState
          title="No validation run yet"
          sub="Click Run Validation to check your inventory for issues."
          action={
            <Button variant="contained" onClick={() => runValidation()}>
              Run Validation
            </Button>
          }
        />
      )}

      {result && !isPending && (
        <>
          {errors === 0 && warnings === 0 ? (
            <Alert severity="success">All checks passed. No errors or warnings found.</Alert>
          ) : (
            <Alert severity={errors > 0 ? 'error' : 'warning'}>
              {errors > 0 && (
                <>
                  <strong>{errors}</strong> error{errors !== 1 ? 's' : ''}
                  {warnings > 0 ? ' · ' : ''}
                </>
              )}
              {warnings > 0 && (
                <>
                  <strong>{warnings}</strong> warning{warnings !== 1 ? 's' : ''}
                </>
              )}
            </Alert>
          )}

          {findings.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`All (${findings.length})`}
                onClick={() => setFilter('')}
                color={filter === '' ? 'primary' : 'default'}
                variant={filter === '' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`${SEVERITY_META.error.label} (${errors})`}
                onClick={() => setFilter('error')}
                color="error"
                variant={filter === 'error' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`${SEVERITY_META.warning.label} (${warnings})`}
                onClick={() => setFilter('warning')}
                color="warning"
                variant={filter === 'warning' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`${SEVERITY_META.info.label} (${infos})`}
                onClick={() => setFilter('info')}
                color="info"
                variant={filter === 'info' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Duplicate Devices (${duplicateCount})`}
                onClick={() => setFilter('duplicates')}
                color="default"
                variant={filter === 'duplicates' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Bandwidth Issues (${bandwidthCount})`}
                onClick={() => setFilter('bandwidth')}
                color="default"
                variant={filter === 'bandwidth' ? 'filled' : 'outlined'}
              />
            </Stack>
          )}

          {findings.length === 0 ? (
            <EmptyState title="No findings" sub="No issues detected." />
          ) : (
            <Stack spacing={1.5}>
              {GROUP_ORDER.map((key) => {
                const items = grouped[key]
                if (items.length === 0) return null
                const meta = GROUP_META[key]
                return (
                  <Accordion key={key} defaultExpanded variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={600}>
                          {meta.label}
                        </Typography>
                        <Chip label={items.length} size="small" />
                        {meta.hint && (
                          <Typography variant="caption" color="text.secondary">
                            {meta.hint}
                          </Typography>
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FindingsTimeline findings={items} onSelect={setSelectedFinding} />
                    </AccordionDetails>
                  </Accordion>
                )
              })}

              {/* Tag validation isn't implemented in the engine yet -- see
                  core/validator.py's "Rules deliberately deferred" section
                  (TAG_UNKNOWN_VALUE, TAG_WRONG_SCOPE). Shown as a clearly
                  labeled empty slot rather than fabricated findings. */}
              <Accordion variant="outlined" disableGutters disabled>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={600}>
                      Tag Validation
                    </Typography>
                    <Chip label="Not yet available" size="small" variant="outlined" />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Tag-level checks (unknown tag values, wrong scope) aren&apos;t implemented in the
                    validation engine yet -- see core/validator.py.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}
        </>
      )}

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </Stack>
  )
}
