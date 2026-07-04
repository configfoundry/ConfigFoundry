'use client'

import type { ReactNode } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'

interface FormDrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions: ReactNode
  width?: number
}

/**
 * Right-anchored form drawer, used for the Add/Edit forms across migrated
 * modules (Devices, Bandwidth, Subnets, and future modules) instead of the
 * old centered Modal component -- same Cancel/Save action pattern, same
 * onSave/onClose call sites in each caller.
 */
export function FormDrawer({ open, title, onClose, children, actions, width = 420 }: FormDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: width }, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>{children}</Box>
        <Divider />
        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ px: 2.5, py: 2 }}>
          {actions}
        </Stack>
      </Box>
    </Drawer>
  )
}
