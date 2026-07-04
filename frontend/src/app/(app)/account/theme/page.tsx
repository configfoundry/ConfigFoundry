import { PageHeader } from '@/components/common/PageHeader'
import { ThemeSettingsView } from '@/modules/account/ThemeSettingsView'

// Tab strip removed -- see account/profile/page.tsx.
export default function AccountThemePage() {
  return (
    <>
      <PageHeader title="Theme" description="Appearance settings. Applies immediately and persists across sessions." />
      <ThemeSettingsView />
    </>
  )
}
