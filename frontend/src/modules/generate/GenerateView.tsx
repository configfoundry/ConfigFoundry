'use client'

/**
 * Generate Configuration -- UX refinement pass rewrite. The previous
 * version had a Stepper that was purely decorative (all content rendered
 * in one long scroll regardless of step) and a duplicated "Generate YAML"
 * CTA (one in the toolbar, a second inside the empty state shown right
 * below it). This version makes the stepper the actual navigation: each
 * step renders its own content, and there is exactly one primary action
 * per step.
 *
 * Findings pass (this revision): the old layout showed the same facts up
 * to three times -- a raw missingRegionDevices banner, a raw
 * missingCredsDevices banner, and a "N errors -- msg1; msg2 and N more"
 * banner built from result.findings -- because core/logic.py's
 * missingRegionDevices/missingCredsDevices and core/validator.py's
 * DEVICE_NO_REGION/DEVICE_MISSING_CREDS findings describe the exact same
 * underlying facts (confirmed by reading both). result.findings is now the
 * single source of truth, rendered with the same grouped-Accordion +
 * FindingsTimeline + FindingDetailDialog components the Validation module
 * already uses (modules/validation/findingGroups.ts et al.) -- same
 * pattern the user sees when they run Validation directly, not a
 * one-off. The alert severities render as translucent tinted panels (via
 * the shared theme's MuiAlert override), not solid pastel fills, so they
 * hold up in both light and dark mode.
 *
 * Business logic is 100% unchanged from the previous version:
 *  - Same api.generate() call (server-side generation + validation).
 *  - Same query invalidation on success (['meta'], ['history']).
 *  - Same client-side Blob download for individual files and "download all".
 *  - Same Diff Viewer (api.getHistory + api.getHistoryEntry), same
 *    Generation Log built from result fields only, same Breakdown by Region
 *    table, same confirm-before-download-with-issues dialog.
 *
 * Step 1 Review Inventory reads live /meta counts and the shared
 * validation-result cache (see modules/validation/useValidationResult.ts)
 * so a validation run from the Validation section shows up here too,
 * without a second validation call. Its stat tiles now use the shared
 * StatCard component (components/common/StatCard.tsx) for visual parity
 * with the Dashboard's KPI tiles instead of bare Typography.
 *
 * Step 3 Export's "Download All" produces one browser download per file,
 * not a single .zip -- there is no zip-creation dependency in this project
 * and no server-side archive endpoint (checked package.json and api.ts), so
 * it is not labeled as ZIP export to avoid promising a format that isn't
 * actually produced. "Deploy" has no backend counterpart either (no
 * deploy/deployment endpoint anywhere in api.ts) and is shown as an
 * informational, disabled action rather than invented.
 */
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import LanOutlinedIcon from '@mui/icons-material/LanOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import Icon from '@/@core/components/icon'
import { api } from '@/lib/api'
import type { GenerateResult, HistoryEntry, Finding } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatCard } from '@/components/common/StatCard'
import { useValidationResult } from '@/modules/validation/useValidationResult'
import { FindingsTimeline } from '@/modules/validation/FindingsTimeline'
import { FindingDetailDialog } from '@/modules/validation/FindingDetailDialog'
import { SEVERITY_META, GROUP_META, groupFindings, type GroupKey } from '@/modules/validation/findingGroups'
import { CodeViewer } from './CodeViewer'
import { DiffViewer } from './DiffViewer'

function fmtTs(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STEPS = ['Review Inventory', 'Generate Configuration', 'Export']
const GROUP_ORDER: GroupKey[] = ['device', 'bandwidth', 'network', 'other']

export function GenerateView() {
  const qc = useQueryClient()
  const router = useRouter()
  const { toast } = useToast()
  const [activeStep, setActiveStep] = useState(0)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [confirmDownloadAll, setConfirmDownloadAll] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const [genStart, setGenStart] = useState<number | null>(null)
  const [genEnd, setGenEnd] = useState<number | null>(null)
  const [findingsFilter, setFindingsFilter] = useState<'' | 'error' | 'warning'>('')
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.getMeta() })
  const validationResult = useValidationResult()

  // Recent History entries -- powers both "history for every generated
  // config" browsing and the Diff Viewer's "compare against" picker.
  const { data: historyList } = useQuery({ queryKey: ['history', 25], queryFn: () => api.getHistory(25) })

  // Snapshot of history entries taken *before* the run currently being
  // generated. GET /generate persists its own result to yaml_history before
  // returning, so re-querying "most recent" after a generate would just
  // return the run comparing itself against itself. Freezing the pre-run
  // list here (via a ref, set synchronously in the click handler below)
  // sidesteps that race entirely -- the picker only ever offers entries
  // that existed *before* the current result.
  const preGenerateEntriesRef = useRef<HistoryEntry[]>([])
  const [compareOptions, setCompareOptions] = useState<HistoryEntry[]>([])
  const [compareEntryId, setCompareEntryId] = useState<string | undefined>(undefined)

  const { data: previousDetail } = useQuery({
    queryKey: ['history-detail', compareEntryId],
    queryFn: () => api.getHistoryEntry(compareEntryId as string),
    enabled: !!compareEntryId && diffMode,
  })
  const compareEntry = compareOptions.find((e) => e.id === compareEntryId)

  const {
    mutate: runGenerate,
    isLoading: isPending,
    error,
  } = useMutation({
    mutationFn: () => api.generate(),
    onMutate: () => setGenStart(Date.now()),
    onSuccess: (res) => {
      setResult(res)
      setGenEnd(Date.now())
      setFindingsFilter('')
      const priorEntries = preGenerateEntriesRef.current
      setCompareOptions(priorEntries)
      setCompareEntryId(priorEntries[0]?.id)
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['history'] })
      const fileCount = Object.keys(res.files ?? {}).length
      toast(
        `Generated ${fileCount} file${fileCount !== 1 ? 's' : ''} — ${res.snmpTotal ?? 0} SNMP, ${res.icmpTotal ?? 0} ICMP`,
        'success',
        6000,
      )
    },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  function handleGenerate() {
    preGenerateEntriesRef.current = historyList?.entries ?? []
    runGenerate()
  }

  function downloadAll() {
    if (!result) return
    Object.entries(result.files ?? {}).forEach(([name, content]) => downloadBlob(name, content))
  }

  const files = Object.entries(result?.files ?? {})
  const findings = result?.findings ?? []
  const errorFindings = findings.filter((f) => f.severity === 'error')
  const warnFindings = findings.filter((f) => f.severity === 'warning')
  const hasIssues = errorFindings.length > 0 || warnFindings.length > 0
  const filteredFindings = findingsFilter ? findings.filter((f) => f.severity === findingsFilter) : findings
  const groupedFindings = groupFindings(filteredFindings)

  // A step is reachable once its prerequisite is satisfied: Generate needs
  // nothing (Review is informational), Export needs a result to exist.
  const maxReachableStep = result ? 2 : 1

  const logLines = useMemo(() => {
    if (!result) return []
    const lines: string[] = []
    const t = (ms: number | null) => (ms ? new Date(ms).toLocaleTimeString() : '—')
    lines.push(`[${t(genStart)}] Generation started`)
    lines.push(`[${t(genStart)}] Validating inventory…`)
    if (errorFindings.length) lines.push(`[${t(genStart)}] ${errorFindings.length} error(s) found`)
    if (warnFindings.length) lines.push(`[${t(genStart)}] ${warnFindings.length} warning(s) found`)
    lines.push(`[${t(genEnd)}] ${result.snmpTotal ?? 0} SNMP devices, ${result.icmpTotal ?? 0} ICMP-only devices resolved`)
    lines.push(`[${t(genEnd)}] Wrote ${Object.keys(result.files ?? {}).length} file(s)`)
    lines.push(`[${t(genEnd)}] ${result.summary}`)
    return lines
  }, [result, genStart, genEnd, errorFindings.length, warnFindings.length])

  return (
    <Stack spacing={4}>
      <Card variant="outlined">
        <CardContent sx={{ py: 3 }}>
          <Stepper activeStep={activeStep} nonLinear>
            {STEPS.map((label, i) => (
              <Step key={label} completed={i === 0 ? true : i === 1 ? !!result : false}>
                <StepButton disabled={i > maxReachableStep} onClick={() => setActiveStep(i)}>
                  {label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {activeStep === 0 && (
        <Card>
          <CardHeader title="Inventory summary" subheader="What will be included when you generate configuration." />
          <Divider />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <StatCard label="Devices" value={meta?.deviceCount ?? '—'} icon={RouterOutlinedIcon} color="primary" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Bandwidth Profiles" value={meta?.bandwidthCount ?? '—'} icon={SpeedOutlinedIcon} color="info" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Subnets" value={meta?.subnetCount ?? '—'} icon={LanOutlinedIcon} color="success" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Templates" value="—" sub="Coming soon" icon={DescriptionOutlinedIcon} color="secondary" />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 4 }} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Validation status</Typography>
            {validationResult ? (
              <Alert
                severity={
                  validationResult.findings?.some(f => f.severity === 'error') ? 'error'
                    : validationResult.findings?.some(f => f.severity === 'warning') ? 'warning'
                    : 'success'
                }
                action={
                  <Button color="inherit" size="small" onClick={() => router.push('/validation/findings')}>
                    View Findings
                  </Button>
                }
              >
                {validationResult.summary}
              </Alert>
            ) : (
              <Alert
                severity="info"
                action={
                  <Button color="inherit" size="small" onClick={() => router.push('/validation/run')}>
                    Run Validation
                  </Button>
                }
              >
                Not validated yet this session. You can still generate -- generation re-validates automatically -- but
                running validation first lets you fix issues before producing output.
              </Alert>
            )}
          </CardContent>
          <Divider />
          <CardContent sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" endIcon={<Icon icon="tabler:arrow-right" />} onClick={() => setActiveStep(1)}>
              Continue to Generate
            </Button>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Stack spacing={4}>
          <Card>
            <CardHeader
              title="Generate Configuration"
              subheader={
                result ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    <Chip size="small" variant="outlined" label={`${files.length} file${files.length !== 1 ? 's' : ''}`} />
                    <Chip size="small" variant="outlined" label={`${result.snmpTotal ?? 0} SNMP · ${result.icmpTotal ?? 0} ICMP`} />
                    {errorFindings.length > 0 && (
                      <Chip size="small" color="error" label={`${errorFindings.length} error${errorFindings.length !== 1 ? 's' : ''}`} />
                    )}
                    {warnFindings.length > 0 && (
                      <Chip size="small" color="warning" label={`${warnFindings.length} warning${warnFindings.length !== 1 ? 's' : ''}`} />
                    )}
                    {errorFindings.length === 0 && warnFindings.length === 0 && (
                      <Chip size="small" color="success" icon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />} label="No issues" />
                    )}
                  </Stack>
                ) : meta ? (
                  `${meta.deviceCount} devices · ${meta.bandwidthCount} bandwidth rows · ${meta.subnetCount} subnets`
                ) : (
                  'Loading inventory summary…'
                )
              }
              action={
                <Button variant="contained" startIcon={<Icon icon="tabler:wand" />} onClick={handleGenerate} disabled={isPending}>
                  {isPending ? 'Generating…' : 'Generate Configuration'}
                </Button>
              }
            />
            {isPending && <LinearProgress />}
            {!!error && (
              <>
                <Divider />
                <CardContent><Alert severity="error">{(error as Error).message}</Alert></CardContent>
              </>
            )}
          </Card>

          {!isPending && !result && !error && (
            <Card>
              <EmptyState
                title="Nothing generated yet"
                sub="Click Generate Configuration above to produce config files from the current inventory."
              />
            </Card>
          )}

          {result && !isPending && (
            <>
              <Card variant="outlined">
                <CardContent>
                  {errorFindings.length === 0 && warnFindings.length === 0 ? (
                    <Alert severity="success" icon={<CheckCircleOutlinedIcon fontSize="inherit" />}>
                      Generated cleanly -- no errors or warnings found.
                    </Alert>
                  ) : (
                    <Alert severity={errorFindings.length > 0 ? 'error' : 'warning'}>
                      {errorFindings.length > 0 && (
                        <>
                          <strong>{errorFindings.length}</strong> error{errorFindings.length !== 1 ? 's' : ''}
                          {warnFindings.length > 0 ? ' · ' : ' '}
                        </>
                      )}
                      {warnFindings.length > 0 && (
                        <>
                          <strong>{warnFindings.length}</strong> warning{warnFindings.length !== 1 ? 's' : ''}{' '}
                        </>
                      )}
                      found -- review before exporting.
                    </Alert>
                  )}

                  {findings.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
                      <Chip
                        label={`All (${findings.length})`}
                        size="small"
                        onClick={() => setFindingsFilter('')}
                        color={findingsFilter === '' ? 'primary' : 'default'}
                        variant={findingsFilter === '' ? 'filled' : 'outlined'}
                      />
                      {errorFindings.length > 0 && (
                        <Chip
                          label={`${SEVERITY_META.error.label} (${errorFindings.length})`}
                          size="small"
                          onClick={() => setFindingsFilter('error')}
                          color="error"
                          variant={findingsFilter === 'error' ? 'filled' : 'outlined'}
                        />
                      )}
                      {warnFindings.length > 0 && (
                        <Chip
                          label={`${SEVERITY_META.warning.label} (${warnFindings.length})`}
                          size="small"
                          onClick={() => setFindingsFilter('warning')}
                          color="warning"
                          variant={findingsFilter === 'warning' ? 'filled' : 'outlined'}
                        />
                      )}
                    </Stack>
                  )}

                  {findings.length > 0 && (
                    <Stack spacing={1.5} sx={{ mt: 2.5 }}>
                      {GROUP_ORDER.map((key) => {
                        const items = groupedFindings[key]
                        if (items.length === 0) return null
                        const groupMeta = GROUP_META[key]
                        return (
                          <Accordion key={key} defaultExpanded variant="outlined" disableGutters>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={600}>{groupMeta.label}</Typography>
                                <Chip label={items.length} size="small" />
                                {groupMeta.hint && (
                                  <Typography variant="caption" color="text.secondary">{groupMeta.hint}</Typography>
                                )}
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              <FindingsTimeline findings={items} onSelect={setSelectedFinding} />
                            </AccordionDetails>
                          </Accordion>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>Generation Log</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: 12.5, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                    {logLines.join('\n')}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {Object.keys(result.groupStats ?? {}).length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>Breakdown by Region</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Region</TableCell>
                          <TableCell align="right">SNMP</TableCell>
                          <TableCell align="right">ICMP</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(result.groupStats ?? {}).map(([key, s]) => (
                          <TableRow key={key}>
                            <TableCell>{key}</TableCell>
                            <TableCell align="right">{s.snmp_count}</TableCell>
                            <TableCell align="right">{s.icmp_only_count}</TableCell>
                            <TableCell align="right"><strong>{s.snmp_count + s.icmp_only_count}</strong></TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell><strong>Total</strong></TableCell>
                          <TableCell align="right"><strong>{result.snmpTotal ?? 0}</strong></TableCell>
                          <TableCell align="right"><strong>{result.icmpTotal ?? 0}</strong></TableCell>
                          <TableCell align="right"><strong>{(result.snmpTotal ?? 0) + (result.icmpTotal ?? 0)}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {files.length === 0 ? (
                <EmptyState title="No files generated" sub="The inventory may be empty or no devices matched the generation criteria." />
              ) : (
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>Preview -- {files.length} file{files.length !== 1 ? 's' : ''}</Typography>
                      {compareOptions.length > 0 && (
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <FormControlLabel
                            control={<Switch size="small" checked={diffMode} onChange={(e) => setDiffMode(e.target.checked)} />}
                            label={<Typography variant="caption">Diff checker</Typography>}
                          />
                          {diffMode && (
                            <TextField
                              select
                              size="small"
                              label="Compare against"
                              value={compareEntryId ?? ''}
                              onChange={(e) => setCompareEntryId(e.target.value)}
                              sx={{ minWidth: 260 }}
                            >
                              {compareOptions.map((entry, i) => (
                                <MenuItem key={entry.id} value={entry.id}>
                                  {i === 0 ? 'Previous run — ' : ''}{fmtTs(entry.ts)}{entry.summary ? ` — ${entry.summary}` : ''}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        </Stack>
                      )}
                    </Stack>
                    <Stack spacing={2}>
                      {files.map(([name, content]) => {
                        const prevContent = previousDetail?.files?.[name]
                        return (
                          <Box key={name}>
                            <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', mb: 0.75 }}>{name}</Typography>
                            {diffMode && prevContent !== undefined ? (
                              <DiffViewer
                                oldContent={prevContent}
                                newContent={content}
                                oldLabel={compareEntry ? fmtTs(compareEntry.ts) : 'previous run'}
                              />
                            ) : diffMode ? (
                              <Alert severity="info">This file didn&apos;t exist in the selected run -- nothing to compare.</Alert>
                            ) : (
                              <CodeViewer filename={name} content={content} maxHeight={220} />
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" endIcon={<Icon icon="tabler:arrow-right" />} onClick={() => setActiveStep(2)}>
                  Continue to Export
                </Button>
              </Box>
            </>
          )}
        </Stack>
      )}

      {activeStep === 2 && (
        <Stack spacing={4}>
          {!result ? (
            <Card>
              <EmptyState
                title="Nothing to export yet"
                sub="Generate configuration first."
                action={<Button variant="contained" onClick={() => setActiveStep(1)}>Back to Generate</Button>}
              />
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title="Export"
                  subheader={`${files.length} file${files.length !== 1 ? 's' : ''} ready`}
                  action={
                    <Stack direction="row" spacing={1.5}>
                      <Tooltip title={files.length === 0 ? 'No files were produced by this run -- nothing to download.' : ''}>
                        <span>
                          <Button
                            variant="outlined"
                            startIcon={<Icon icon="tabler:download" />}
                            disabled={files.length === 0}
                            onClick={() => (hasIssues ? setConfirmDownloadAll(true) : downloadAll())}
                          >
                            Download All
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="No deployment endpoint exists yet -- export and apply manually.">
                        <span>
                          <Button variant="contained" startIcon={<Icon icon="tabler:rocket" />} disabled>
                            Deploy
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  }
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    {files.map(([name, content]) => (
                      <Box key={name}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', mb: 0.75 }}>{name}</Typography>
                        <CodeViewer filename={name} content={content} maxHeight={260} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={confirmDownloadAll}
        title="Download files with unresolved issues?"
        message="This generation has errors or warnings. Files will still download as generated -- review the findings above before deploying them."
        confirmLabel="Download anyway"
        destructive={false}
        onConfirm={downloadAll}
        onClose={() => setConfirmDownloadAll(false)}
      />

      <FindingDetailDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </Stack>
  )
}
