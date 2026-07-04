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
 * Business logic is 100% unchanged from the previous version:
 *  - Same api.generate() call (server-side generation + validation).
 *  - Same query invalidation on success (['meta'], ['history']).
 *  - Same missingRegionDevices / missingCredsDevices / findings banners.
 *  - Same client-side Blob download for individual files and "download all".
 *  - Same Diff Viewer (api.getHistory(1) + api.getHistoryEntry(id)), same
 *    Generation Log built from result fields only, same Breakdown by Region
 *    table, same confirm-before-download-with-issues dialog.
 *
 * Step 1 Review Inventory reads live /meta counts and the shared
 * validation-result cache (see modules/validation/useValidationResult.ts)
 * so a validation run from the Validation section shows up here too,
 * without a second validation call.
 *
 * Step 3 Export's "Download All" produces one browser download per file,
 * not a single .zip -- there is no zip-creation dependency in this project
 * and no server-side archive endpoint (checked package.json and api.ts), so
 * it is not labeled as ZIP export to avoid promising a format that isn't
 * actually produced. "Deploy" has no backend counterpart either (no
 * deploy/deployment endpoint anywhere in api.ts) and is shown as an
 * informational, disabled action rather than invented.
 */
import { useMemo, useState } from 'react'
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Icon from '@/@core/components/icon'
import { api } from '@/lib/api'
import type { GenerateResult } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useValidationResult } from '@/modules/validation/useValidationResult'
import { CodeViewer } from './CodeViewer'
import { DiffViewer } from './DiffViewer'

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

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.getMeta() })
  const validationResult = useValidationResult()

  // Most recent History entry -- used only to power the Diff Viewer.
  const { data: recentHistory } = useQuery({ queryKey: ['history', 1], queryFn: () => api.getHistory(1) })
  const previousEntryId = recentHistory?.entries?.[0]?.id
  const { data: previousDetail } = useQuery({
    queryKey: ['history-detail', previousEntryId],
    queryFn: () => api.getHistoryEntry(previousEntryId as string),
    enabled: !!previousEntryId && diffMode,
  })

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

  function downloadAll() {
    if (!result) return
    Object.entries(result.files ?? {}).forEach(([name, content]) => downloadBlob(name, content))
  }

  const files = Object.entries(result?.files ?? {})
  const errorFindings = result?.findings?.filter((f) => f.severity === 'error') ?? []
  const warnFindings = result?.findings?.filter((f) => f.severity === 'warning') ?? []
  const hasIssues = errorFindings.length > 0 || warnFindings.length > 0

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
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="overline" color="text.secondary">Devices</Typography>
                <Typography variant="h5">{meta?.deviceCount ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="overline" color="text.secondary">Bandwidth Profiles</Typography>
                <Typography variant="h5">{meta?.bandwidthCount ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="overline" color="text.secondary">Subnets</Typography>
                <Typography variant="h5">{meta?.subnetCount ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="overline" color="text.secondary">Templates</Typography>
                <Chip size="small" variant="outlined" label="No backend yet" />
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
              subheader={meta ? `${meta.deviceCount} devices · ${meta.bandwidthCount} bandwidth rows · ${meta.subnetCount} subnets` : 'Loading inventory summary…'}
              action={
                <Button variant="contained" startIcon={<Icon icon="tabler:wand" />} onClick={() => runGenerate()} disabled={isPending}>
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
              {(result.missingRegionDevices?.length ?? 0) > 0 && (
                <Alert severity="error">
                  <strong>{result.missingRegionDevices!.length}</strong> device{result.missingRegionDevices!.length !== 1 ? 's' : ''} have no
                  Collector Region and were <strong>excluded</strong> from every output file.
                </Alert>
              )}
              {(result.missingCredsDevices?.length ?? 0) > 0 && (
                <Alert severity="warning">
                  <strong>{result.missingCredsDevices!.length}</strong> device{result.missingCredsDevices!.length !== 1 ? 's' : ''} are missing
                  SNMPv3 credentials and were still included in the output.
                </Alert>
              )}
              {errorFindings.length > 0 && (
                <Alert severity="error">
                  <strong>{errorFindings.length}</strong> error{errorFindings.length !== 1 ? 's' : ''} — {errorFindings.slice(0, 2).map((f) => f.message).join('; ')}
                  {errorFindings.length > 2 && ` and ${errorFindings.length - 2} more`}.
                </Alert>
              )}
              {warnFindings.length > 0 && (
                <Alert severity="warning">
                  <strong>{warnFindings.length}</strong> warning{warnFindings.length !== 1 ? 's' : ''} detected.
                </Alert>
              )}

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
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>Preview -- {files.length} file{files.length !== 1 ? 's' : ''}</Typography>
                    {previousEntryId && (
                      <FormControlLabel
                        control={<Switch size="small" checked={diffMode} onChange={(e) => setDiffMode(e.target.checked)} />}
                        label={<Typography variant="caption">Compare to previous run</Typography>}
                      />
                    )}
                  </Stack>
                  <Stack spacing={2}>
                    {files.map(([name, content]) => {
                      const prevContent = previousDetail?.files?.[name]
                      return (
                        <Box key={name}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', mb: 0.75 }}>{name}</Typography>
                          {diffMode && prevContent !== undefined ? (
                            <DiffViewer oldContent={prevContent} newContent={content} />
                          ) : diffMode ? (
                            <Alert severity="info">No previous version of this file to compare against.</Alert>
                          ) : (
                            <CodeViewer filename={name} content={content} maxHeight={220} />
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
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
    </Stack>
  )
}
