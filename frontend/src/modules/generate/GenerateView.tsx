'use client'

/**
 * Generate Config module -- UI-only migration of the old
 * app/(app)/generate/page.tsx. Business logic unchanged:
 *  - Same api.generate() call (server-side generation + validation).
 *  - Same query invalidation on success (['meta'], ['history']).
 *  - Same missingRegionDevices / missingCredsDevices / findings banners.
 *  - Same client-side Blob download for individual files and "download all".
 *
 * Presentation-only additions:
 *  - A 3-step Stepper (Review -> Generate -> Export) as visual structure
 *    around the same single mutation -- no new API calls per step.
 *  - A Code Viewer per generated file (syntax-lite YAML highlighting,
 *    copy/download), replacing the old collapsible <pre> card.
 *  - A Diff Viewer comparing the just-generated file against the same
 *    filename from the most recent History entry, using the existing
 *    api.getHistory(1) + api.getHistoryEntry(id) calls -- no new endpoint.
 *  - A "Logs" panel built from the existing result fields (summary,
 *    snmpTotal/icmpTotal, findings) formatted as a timestamped feed --
 *    there is no server-side log stream to consume, so this reads only
 *    data the mutation already returned.
 *  - A confirmation dialog before "Download All" when errors/warnings
 *    are still present.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { api } from '@/lib/api'
import type { GenerateResult } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
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

const STEPS = ['Review Inventory', 'Generate', 'Export']

export function GenerateView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [confirmDownloadAll, setConfirmDownloadAll] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const [genStart, setGenStart] = useState<number | null>(null)
  const [genEnd, setGenEnd] = useState<number | null>(null)

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.getMeta() })

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

  const activeStep = result ? 2 : isPending ? 1 : 0

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
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Generate Config
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {meta ? `${meta.deviceCount} devices · ${meta.bandwidthCount} bandwidth rows · ${meta.subnetCount} subnets in inventory.` : 'Loading inventory summary…'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              {result && files.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={() => (hasIssues ? setConfirmDownloadAll(true) : downloadAll())}
                >
                  Download All ({files.length})
                </Button>
              )}
              <Button variant="contained" startIcon={<PlayArrowOutlinedIcon />} onClick={() => runGenerate()} disabled={isPending}>
                {isPending ? 'Generating…' : 'Generate YAML'}
              </Button>
            </Stack>
          </Stack>
          {isPending && <LinearProgress sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      {!!error && <Alert severity="error">{(error as Error).message}</Alert>}

      {!isPending && !result && !error && (
        <EmptyState
          title="Nothing generated yet"
          sub="Click Generate YAML to produce config files from the current inventory."
          action={
            <Button variant="contained" onClick={() => runGenerate()}>
              Generate YAML
            </Button>
          }
        />
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

          {/* Logs */}
          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={600}>
                Generation Log
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: 12.5, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                {logLines.join('\n')}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Breakdown by region */}
          {Object.keys(result.groupStats ?? {}).length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Breakdown by Region
                </Typography>
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
                        <TableCell align="right">
                          <strong>{s.snmp_count + s.icmp_only_count}</strong>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{result.snmpTotal ?? 0}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{result.icmpTotal ?? 0}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{(result.snmpTotal ?? 0) + (result.icmpTotal ?? 0)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {files.length === 0 ? (
            <EmptyState title="No files generated" sub="The inventory may be empty or no devices matched the generation criteria." />
          ) : (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {files.length} file{files.length !== 1 ? 's' : ''} generated
                </Typography>
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
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', mb: 0.75 }}>
                        {name}
                      </Typography>
                      {diffMode && prevContent !== undefined ? (
                        <DiffViewer oldContent={prevContent} newContent={content} />
                      ) : diffMode ? (
                        <Alert severity="info">No previous version of this file to compare against.</Alert>
                      ) : (
                        <CodeViewer filename={name} content={content} />
                      )}
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          )}
        </>
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
