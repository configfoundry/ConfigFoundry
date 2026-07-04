import { PageHeader } from '@/components/common/PageHeader'
import { MfaCard } from '@/modules/account/MfaCard'

// Tab strip removed -- see account/profile/page.tsx. Real, backend-connected
// (api.auth.mfaEnrollBegin/Confirm/Disable).
export default function AccountMfaPage() {
  return (
    <>
      <PageHeader title="Multi-Factor Authentication" description="Add a second factor to protect your account." />
      <MfaCard />
    </>
  )
}
