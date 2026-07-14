import { PageHeader } from '@/components/common/PageHeader'
import { GenerateView } from '@/modules/generate/GenerateView'

// The original single-platform generation workflow, moved here unchanged
// (ADR-0008) -- this used to be mounted directly at /configuration/generate.
// GenerateView itself has zero logic changes; only its mount point moved.
//
// Tab strip removed -- the sidebar's Configuration nav group already covers
// Generate/Generated/Deployment History navigation, and stacking a tab
// strip under the breadcrumb on top of that was the exact triple-navigation
// problem called out in the UX refinement pass. GenerateView's own Stepper
// is the real in-page navigation for this workflow (Review -> Generate ->
// Export), so no action lives in this page-level header -- each step
// drives its own primary action.
export default function ConfigurationGenerateDatadogPage() {
  return (
    <>
      <PageHeader
        title="Datadog"
        description="Review inventory, generate Datadog monitoring configuration, and export the result -- in one guided workflow."
      />
      <GenerateView />
    </>
  )
}
