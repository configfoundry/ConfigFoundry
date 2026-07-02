import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getAllDocsMeta, getSearchIndex } from '@/lib/docs'
import { DocsShell } from '@/components/docs/DocsShell'

export const metadata: Metadata = {
  title: 'ConfigFoundry Docs',
  description: 'ConfigFoundry documentation — installation, architecture, API reference, air-gap deployment, and more.',
}

// This whole section is public (no auth required) and fully static --
// unlike app/(app), it is NOT wrapped by AuthProvider's redirect-to
// -login logic, so the docs remain readable without an account, exactly
// like /docs and /redoc (the API reference pages). See docs/architecture.md.
export default function DocsLayout({ children }: { children: ReactNode }) {
  const groups = getAllDocsMeta()
  const searchIndex = getSearchIndex()

  return (
    <DocsShell groups={groups} searchIndex={searchIndex}>
      {children}
    </DocsShell>
  )
}
