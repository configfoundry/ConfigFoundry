'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /administration/users as part of the nav restructure. Kept as a
// client-side redirect (not next.config.mjs redirects() -- this app builds
// with `output: 'export'`, which has no server to run redirects on) so any
// old bookmark/link to /admin/users still lands somewhere real.
export default function AdminUsersRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/administration/users') }, [router])
  return <LoadingRow />
}
