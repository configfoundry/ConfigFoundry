import { PageHeader } from '@/components/common/PageHeader'
import { GlobalSettingsView } from '@/modules/system/GlobalSettingsView'

// Tab strip removed -- the sidebar's System nav group already covers
// Global Settings/Database/Storage/SMTP/etc. navigation. Tag Definitions vs.
// Managed Lists switching within this page stays as an in-page Tabs
// component (GlobalSettingsView) since those are two views of one page's
// own content, not two destinations already reachable from the sidebar.
export default function SystemGlobalSettingsPage() {
  return (
    <>
      <PageHeader title="Global Settings" description="Tag definitions and managed lists shared across inventory." />
      <GlobalSettingsView />
    </>
  )
}
