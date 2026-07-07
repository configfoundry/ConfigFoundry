'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// The Inventory section was renamed to Infrastructure as part of the IA
// restructure (see navigation/vertical/index.ts) -- /inventory and all of
// its sub-routes now redirect to their /infrastructure/* equivalent so any
// old bookmark/link still lands somewhere real. Client-side redirect, not
// next.config.mjs `redirects()`, because the app builds with
// `output: 'export'` (static export served by FastAPI), which doesn't
// support server-side redirects.
export default function InventoryIndexRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/infrastructure/devices')
  }, [router])

  return <LoadingRow />
}
