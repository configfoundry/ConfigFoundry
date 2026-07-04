'use client'

/**
 * Richer empty state for "nothing here yet, here's how to get started"
 * situations (as opposed to EmptyState, which is for small in-page empty
 * lists/tables). Icon -> Title -> Description -> Primary/Secondary actions
 * -> optional "Learn more" documentation link. One clear primary action --
 * callers should not also render a duplicate CTA elsewhere on the page.
 */
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Link from 'next/link'
import Icon from '@/@core/components/icon'
import type { ReactNode } from 'react'

interface Props {
  icon?: string
  title: string
  description: string
  primaryLabel: string
  onPrimary: () => void
  primaryIcon?: string
  secondaryLabel?: string
  onSecondary?: () => void
  docsHref?: string
  extra?: ReactNode
}

export function OnboardingEmptyState({
  icon = 'tabler:file-code',
  title,
  description,
  primaryLabel,
  onPrimary,
  primaryIcon = 'tabler:plus',
  secondaryLabel,
  onSecondary,
  docsHref,
  extra,
}: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 10, px: 4, maxWidth: 460, mx: 'auto' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 4,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'action.selected',
          color: 'primary.main',
        }}
      >
        <Icon icon={icon} fontSize="2rem" />
      </Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>{description}</Typography>
      <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: docsHref ? 3 : 0 }}>
        <Button variant="contained" startIcon={<Icon icon={primaryIcon} />} onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button variant="outlined" onClick={onSecondary}>{secondaryLabel}</Button>
        )}
      </Stack>
      {docsHref && (
        <Typography variant="body2">
          <Button component={Link} href={docsHref} size="small" endIcon={<Icon icon="tabler:arrow-right" fontSize="0.9rem" />}>
            Learn more in Documentation
          </Button>
        </Typography>
      )}
      {extra}
    </Box>
  )
}
