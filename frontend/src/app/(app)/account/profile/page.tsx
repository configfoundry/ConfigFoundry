import { PageHeader } from '@/components/common/PageHeader'
import { ProfileView } from '@/modules/account/ProfileView'

// Tab strip removed -- the sidebar's Account nav group already covers
// Profile/Preferences/Theme/Notifications/Sessions/MFA/API Tokens navigation.
export default function AccountProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your account details and password." />
      <ProfileView />
    </>
  )
}
