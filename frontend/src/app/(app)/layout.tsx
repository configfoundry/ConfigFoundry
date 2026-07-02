'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/providers/AuthProvider'
import { LoadingRow } from '@/components/ui/Spinner'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingRow text="Loading session…" />
      </div>
    )
  }

  return <AppShell>{children}</AppShell>
}
