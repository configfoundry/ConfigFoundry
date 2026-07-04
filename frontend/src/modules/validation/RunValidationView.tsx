'use client'

/**
 * Run Validation -- split out of the old single-page ValidationView.tsx.
 * Same api.generate() call, same cache invalidation. The result is now also
 * written to the shared ['validation-result'] cache entry (see
 * useValidationResult.ts) so /validation/findings can pick it up after
 * navigation, since Run/Findings/History are separate routes now.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import Icon from '@/@core/components/icon'
import { api } from '@/lib/api'
import type { GenerateResult } from '@/lib/types'
import { useSetValidationResult } from './useValidationResult'

export function RunValidationView() {
  const qc = useQueryClient()
  const router = useRouter()
  const setValidationResult = useSetValidationResult()
  const [result, setResult] = useState<GenerateResult | null>(null)

  const {
    mutate: runValidation,
    isLoading: isPending,
    error,
  } = useMutation({
    mutationFn: () => api.generate(),
    onSuccess: (res) => {
      setResult(res)
      setValidationResult(res)
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const findings = result?.findings ?? []
  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.filter((f) => f.severity === 'warning').length

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              {result ? (
                <Typography variant="body2" color="text.secondary">
                  {result.summary}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {isPending ? 'Running the validation engine…' : 'Last run: never in this session.'}
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
          <Box>
            <Button
              variant="outlined"
              endIcon={<Icon icon="tabler:arrow-right" />}
              onClick={() => router.push('/validation/findings')}
            >
              View Findings
            </Button>
          </Box>
        </>
      )}
    </Stack>
  )
}
