import { PageHeader } from '@/components/common/PageHeader'
import { PreferencesView } from '@/modules/account/PreferencesView'

// Tab strip removed -- see account/profile/page.tsx.
export default function AccountPreferencesPage() {
  return (
    <>
      <PageHeader title="Preferences" description="Navigation and notification-display behavior. Applies immediately." />
      <PreferencesView />
    </>
  )
}
