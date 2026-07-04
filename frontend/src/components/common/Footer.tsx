import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        px: 3,
        py: 2,
        borderTop: (t) => `1px solid ${t.palette.divider}`,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © {new Date().getFullYear()} ConfigFoundry. All rights reserved.
      </Typography>
      <Link
        href="https://github.com/configfoundry/ConfigFoundry"
        target="_blank"
        rel="noopener noreferrer"
        variant="caption"
        underline="hover"
      >
        GitHub ↗
      </Link>
    </Box>
  )
}
