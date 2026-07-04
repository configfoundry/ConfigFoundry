'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /administration/roles -- see /admin/users/page.tsx for why this
// is a client-side redirect rather than a config-level one.
export default function AdminRolesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/administration/roles') }, [router])
  return <LoadingRow />
}
