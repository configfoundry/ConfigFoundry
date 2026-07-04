'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Typography from '@mui/material/Typography'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { PAGE_TITLES } from '@/navigation/vertical'

/** Derives breadcrumbs from the current path + the existing PAGE_TITLES map. No routing changes. */
export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((_, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = PAGE_TITLES[href] ?? segments[i].replace(/-/g, ' ')
    return { href, label }
  })

  if (crumbs.length === 0) return null

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon sx={{ fontSize: 16 }} />}
      sx={{ fontSize: 13, '& .MuiBreadcrumbs-li': { display: 'flex' } }}
    >
      <Typography component={Link} href="/dashboard" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>
        Home
      </Typography>
      {crumbs.map((c, i) =>
        i === crumbs.length - 1 ? (
          <Typography key={c.href} variant="body2" color="text.primary" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
            {c.label}
          </Typography>
        ) : (
          <Typography
            key={c.href}
            component={Link}
            href={c.href}
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none', textTransform: 'capitalize' }}
          >
            {c.label}
          </Typography>
        ),
      )}
    </MuiBreadcrumbs>
  )
}
