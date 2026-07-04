'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /administration/api-keys -- see /admin/users/page.tsx for why
// this is a client-side redirect rather than a config-level one.
export default function AdminApiKeysRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/administration/api-keys') }, [router])
  return <LoadingRow />
}
