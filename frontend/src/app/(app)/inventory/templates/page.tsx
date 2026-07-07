'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /infrastructure/templates as part of the Inventory -> Infrastructure
// IA rename. Kept as a client-side redirect (not next.config.mjs redirects()
// -- this app builds with `output: 'export'`, which has no server to run
// redirects on) so any old bookmark/link still lands somewhere real.
export default function InventoryTemplatesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/infrastructure/templates') }, [router])
  return <LoadingRow />
}
