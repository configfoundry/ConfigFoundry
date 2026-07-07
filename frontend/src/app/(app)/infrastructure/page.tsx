'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingRow } from '@/components/ui/Spinner'

// /infrastructure redirects to /infrastructure/devices -- the section is a
// nav group with one route per resource type (see navigation/vertical/index.ts),
// not a single tabbed page. This is a client-side redirect, not next.config.mjs
// `redirects()`, because the app builds with `output: 'export'` (static
// export served by FastAPI) which doesn't support server-side redirects.
export default function InfrastructureIndexRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/infrastructure/devices')
  }, [router])

  return <LoadingRow />
}
