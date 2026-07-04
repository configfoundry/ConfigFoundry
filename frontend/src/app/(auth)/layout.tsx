import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Shared auth layout -- centers whatever auth page is rendered inside a
 * max-width column. UI only; no routing or auth logic here.
 *
 * The "ConfigFoundry" brand header used to live inside login/page.tsx.
 * Moved here since it's shared chrome, not something specific to the
 * login form -- the only structural (non-cosmetic) call made in this
 * migration pass.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Typography variant="h5" fontWeight={700}>
            Config<Box component="span" sx={{ color: 'primary.main' }}>Foundry</Box>
          </Typography>
        </Box>
        {children}
      </Box>
    </Box>
  )
}
