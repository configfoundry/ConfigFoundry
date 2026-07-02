import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getAllDocsMeta, getSearchIndex, getVersion } from '@/lib/docs'
import { DocsShell } from '@/components/docs/DocsShell'

export const metadata: Metadata = {
  title: 'ConfigFoundry Docs',
  description: 'ConfigFoundry documentation — installation, architecture, API reference, air-gap deployment, and more.',
}

// This whole section is public (no auth required) and fully static --
// unlike app/(app), it is NOT wrapped by AuthProvider's redirect-to
// -login logic, so the docs remain readable without an account. It
// intentionally lives at /documentation, not /docs -- that path is
// reserved for FastAPI's self-hosted Swagger UI (see app.py and
// docs/architecture.md), and ReDoc remains at /redoc, both untouched by
// this portal.
export default function DocsLayout({ children }: { children: ReactNode }) {
  const groups = getAllDocsMeta()
  const searchIndex = getSearchIndex()
  const version = getVersion()

  return (
    <DocsShell groups={groups} searchIndex={searchIndex} version={version}>
      {children}
    </DocsShell>
  )
}
