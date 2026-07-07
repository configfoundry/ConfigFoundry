'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /infrastructure/details as part of the Inventory -> Infrastructure
// IA rename. Kept as a client-side redirect (not next.config.mjs redirects()
// -- this app builds with `output: 'export'`, which has no server to run
// redirects on) so any old bookmark/link still lands somewhere real. This
// route carries an `?id=` query param (see infrastructure/details/page.tsx
// for why it's query-param based, not a dynamic segment), so the redirect
// forwards the full current query string rather than dropping it.
export default function InventoryDetailsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/infrastructure/details?${qs}` : '/infrastructure/details')
  }, [router, searchParams])

  return <LoadingRow />
}
