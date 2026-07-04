'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// /validation now redirects to /validation/run -- see /inventory/page.tsx
// for why this is a client-side redirect (output: 'export' has no server
// to run next.config.mjs redirects() on).
export default function ValidationIndexRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/validation/run') }, [router])
  return <LoadingRow />
}
