import { PageHeader } from '@/components/common/PageHeader'
import { GenerateView } from '@/modules/generate/GenerateView'

// Tab strip removed -- the sidebar's Configuration nav group already covers
// Generate/Generated/Deployment History navigation, and stacking a tab
// strip under the breadcrumb on top of that was the exact triple-navigation
// problem called out in the UX refinement pass. GenerateView's own Stepper
// is the real in-page navigation for this workflow (Review -> Generate ->
// Export), so no action lives in this page-level header -- each step
// drives its own primary action.
export default function ConfigurationGeneratePage() {
  return (
    <>
      <PageHeader
        title="Generate Configuration"
        description="Review inventory, generate device configuration, and export the result -- in one guided workflow."
      />
      <GenerateView />
    </>
  )
}
