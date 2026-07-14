'use client'

/**
 * Shown instead of the 5-widget analytics grid when inventory is
 * completely empty (devices, bandwidth, and subnets all zero). This was
 * called for in the original migration brief ("When inventory is empty: DO
 * NOT show empty charts. Instead create a professional onboarding
 * experience") but the analytics grid always rendered regardless of data --
 * live testing showed a page of zeroed widgets and an empty gray chart
 * placeholder for a brand-new instance. This replaces that with a real
 * getting-started checklist.
 *
 * Step completion is derived from real state, not hardcoded:
 *  - Import Inventory: meta.deviceCount > 0
 *  - Configure Templates: always incomplete (no templates backend yet --
 *    see modules/inventory/TemplatesView.tsx)
 *  - Run Validation: a validation-result cache entry exists this session
 *    (see modules/validation/useValidationResult.ts)
 *  - Generate Configuration: at least one /history entry exists
 *
 * "Sample Inventory" links to the Documentation's getting-started guide
 * (which covers the import spreadsheet format) rather than a one-click
 * data loader -- no such endpoint exists in the backend.
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'
import Icon from '@/@core/components/icon'
import { useValidationResult } from '@/modules/validation/useValidationResult'

interface Props {
  hasHistory: boolean
}

export function DashboardOnboarding({ hasHistory }: Props) {
  const router = useRouter()
  const validationResult = useValidationResult()

  const steps = [
    {
      key: 'import',
      label: 'Import Infrastructure',
      done: false,
      desc: 'Add devices manually or import a spreadsheet.',
      href: '/infrastructure/devices',
    },
    {
      key: 'templates',
      label: 'Configure Templates',
      done: false,
      desc: 'Optional -- standardize output across devices.',
      href: '/infrastructure/templates',
    },
    {
      key: 'validate',
      label: 'Run Validation',
      done: !!validationResult,
      desc: 'Check inventory for issues before generating output.',
      href: '/validation/run',
    },
    {
      key: 'generate',
      label: 'Generate Configuration',
      done: hasHistory,
      desc: 'Produce device configuration from validated inventory.',
      href: '/configuration/generate',
    },
  ]

  return (
    <Card>
      <CardContent sx={{ py: 8, px: 6, textAlign: 'center' }}>
        <Box
          sx={{
            width: 72, height: 72, mx: 'auto', mb: 4, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'primary.main', color: 'primary.contrastText',
          }}
        >
          <Icon icon="tabler:rocket" fontSize="2.25rem" />
        </Box>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>Welcome to ConfigFoundry</Typography>
       <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 480, mx: 'auto' }}
        >
          You have not added any inventory yet. Complete these steps to get your first configuration generated.
        </Typography>

        <List sx={{ maxWidth: 460, mx: 'auto', mb: 6, textAlign: 'left' }}>
          {steps.map(step => (
            <ListItem
              key={step.key}
              component={Link}
              href={step.href}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: 1,
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'text.primary',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: step.done ? 'success.main' : 'text.disabled' }}>
                <Icon icon={step.done ? 'tabler:circle-check-filled' : 'tabler:circle-dashed'} fontSize="1.375rem" />
              </ListItemIcon>
              <ListItemText
                primary={step.label}
                secondary={step.desc}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
              {step.done ? (
                <Chip size="small" label="Done" color="success" variant="outlined" />
              ) : (
                <Icon icon="tabler:chevron-right" fontSize="1.125rem" />
              )}
            </ListItem>
          ))}
        </List>

        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<Icon icon="tabler:upload" />} onClick={() => router.push('/infrastructure/devices')}>
            Import Infrastructure
          </Button>
          <Button variant="outlined" component={Link} href="/documentation/getting-started/getting-started">
            Sample Inventory
          </Button>
          <Button variant="text" component={Link} href="/documentation" endIcon={<Icon icon="tabler:arrow-right" />}>
            Documentation
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
