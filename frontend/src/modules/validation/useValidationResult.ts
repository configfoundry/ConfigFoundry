import { useQueryClient } from '@tanstack/react-query'
import type { GenerateResult } from '@/lib/types'

/**
 * Shared cross-page access to the last validation run's result.
 *
 * Validation and Configuration Generation are the SAME backend action --
 * both call POST /generate (core/validator.py runs, then core writes YAML +
 * a history entry; see GenerateResult in lib/types). There's no separate
 * "dry run" endpoint. The old single-page ValidationView kept the last
 * result in local useState, which worked because Run/Findings were the same
 * component. Now that Run Validation, Findings, and Validation History are
 * separate routes (navigation/vertical/index.ts), the result has to survive
 * a route change -- so it's written into the shared react-query cache
 * (key: ['validation-result']) instead of component state. The
 * QueryClientProvider lives above the (app) layout, so this cache entry
 * outlives any single page's mount/unmount.
 */
export const VALIDATION_RESULT_KEY = ['validation-result'] as const

export function useSetValidationResult() {
  const qc = useQueryClient()
  return (result: GenerateResult) => qc.setQueryData(VALIDATION_RESULT_KEY, result)
}

export function useValidationResult(): GenerateResult | null {
  const qc = useQueryClient()
  return qc.getQueryData<GenerateResult>(VALIDATION_RESULT_KEY) ?? null
}
