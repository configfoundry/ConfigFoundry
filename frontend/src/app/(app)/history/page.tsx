'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// This page's two tabs were split by the nav restructure: "YAML History" ->
// /configuration/generated (same /history feed, see GenerationHistoryList.tsx),
// "Audit Log" -> /administration/audit-logs (already its own real page,
// reading the same GET /audit endpoint this tab used). Redirecting to the
// former since it was the default tab here.
export default function HistoryRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/configuration/generated') }, [router])
  return <LoadingRow />
}
