'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// Moved to /administration/audit-logs -- see /admin/users/page.tsx for why
// this is a client-side redirect rather than a config-level one.
export default function AdminAuditLogsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/administration/audit-logs') }, [router])
  return <LoadingRow />
}
