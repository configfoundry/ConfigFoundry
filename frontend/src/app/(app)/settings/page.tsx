'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// This page's three tabs were split by the nav restructure: Tag Definitions
// + Managed Lists -> /system/global-settings (see GlobalSettingsView.tsx),
// Security (password/MFA/sessions) -> /account/profile, /account/mfa,
// /account/sessions (see modules/account/*). Redirecting to the former
// since it was the default tab here.
export default function SettingsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/system/global-settings') }, [router])
  return <LoadingRow />
}
