'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// IP Policies moved to /system/security-policies to match the requested
// System > Security Policies IA (see modules/administration/PoliciesView.tsx,
// reused as-is -- same component, new location).
export default function AdminPoliciesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/system/security-policies') }, [router])
  return <LoadingRow />
}
