import { PageHeader } from '@/components/common/PageHeader'
import { SessionsCard } from '@/modules/account/SessionsCard'

// Tab strip removed -- see account/profile/page.tsx. Real, backend-connected
// (api.auth.listSessions/revokeSession).
export default function AccountSessionsPage() {
  return (
    <>
      <PageHeader title="Sessions" description="Devices and browsers currently signed in to your account." />
      <SessionsCard />
    </>
  )
}
