import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'

interface StatusChipProps {
  label: string
  tone: 'success' | 'error' | 'warning' | 'info' | 'neutral'
  variant?: ChipProps['variant']
}

const TONE_COLOR: Record<StatusChipProps['tone'], ChipProps['color']> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
  neutral: 'default',
}

/** Shared status/badge chip used across Administration tables (active/inactive, enabled/revoked, allow/deny, system/custom...). */
export function StatusChip({ label, tone, variant = 'filled' }: StatusChipProps) {
  return <Chip label={label} color={TONE_COLOR[tone]} size="small" variant={variant} />
}
