'use client'

/**
 * Findings -- split out of the old single-page ValidationView.tsx. Reads
 * the last run's result from the shared ['validation-result'] cache entry
 * (see useValidationResult.ts) rather than local state, since Run
 * Validation now lives on its own route. If nothing has been run yet this
 * session, says so plainly with a link back to Run Validation instead of
 * fabricating findings.
 */
import { useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { Finding } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'
import { useValidationResult } from './useValidationResult'
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

export function FindingsView() {
  const result = useValidationResult()
  const [filter, setFilter] = useState<FilterKey>('')
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  if (!result) {
    return (
      <EmptyState
        title="No validation run yet"
        sub="Run validation to see findings here."
        action={
          <Button component={Link} href="/validation/run" variant="contained">
            Run Validation
          </Button>
        }
      />
    )
  }

  const findings = result.findings ?? []
  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.filter((f) => f.severity === 'warning').length
  const infos = findings.filter((f) => f.severity === 'info').length
  const duplicateCount = findings.filter((f) => DUPLICATE_DEVICE_CODES.has(f.code ?? '')).length
  const bandwidthCount = findings.filter((f) => BANDWIDTH_ISSUE_CODES.has(f.code ?? '')).length

  const filtered = findings.filter((f) => matchesFilter(f, filter))
  const grouped = groupFindings(filtered)

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">
        {result.summary}
      </Typography>

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
        <EmptyState title="No findings" sub="No issues detected in the last run." />
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

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </Stack>
  )
}
