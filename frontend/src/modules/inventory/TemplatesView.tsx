'use client'

// ---------------------------------------------------------------------------
// Templates -- new page added by the nav restructure. There is no
// templates backend yet (no model, no repository, no /templates API --
// confirmed against api.ts and models/). Honest onboarding shell: one
// primary action (not duplicated between a page header button and an
// empty-state button, per the UX refinement pass), disabled-until-backend
// dialog stub instead of silently doing nothing or pretending to save.
//
// TODO(backend): add a Template model + CRUD endpoints, then swap the
// useState stand-in below for a useQuery(['templates']) + real list/detail,
// following the same pattern as modules/inventory/DevicesView.tsx.
// ---------------------------------------------------------------------------
import { useState } from 'react'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import { OnboardingEmptyState } from '@/components/common/OnboardingEmptyState'

export function TemplatesView() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Card>
      <OnboardingEmptyState
        icon="tabler:template"
        title="No templates yet"
        description="Templates let you standardize configuration output across devices. This section is ready to go as soon as a templates backend exists."
        primaryLabel="New Template"
        onPrimary={() => setDialogOpen(true)}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Template</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1 }}>
            Template management isn't connected to a backend yet. This dialog is a UI placeholder --
            wire it to a real Template model + endpoint to enable it.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
