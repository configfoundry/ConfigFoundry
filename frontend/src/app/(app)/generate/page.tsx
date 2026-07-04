'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /configuration/generate -- see /inventory/page.tsx for why this
// is a client-side redirect rather than a config-level one.
export default function GenerateRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/configuration/generate') }, [router])
  return <LoadingRow />
}
