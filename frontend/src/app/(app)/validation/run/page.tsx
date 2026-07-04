import { PageHeader } from '@/components/common/PageHeader'
import { RunValidationView } from '@/modules/validation/RunValidationView'

// Tab strip removed -- the sidebar's Validation nav group already covers
// Run/Findings/History navigation.
export default function RunValidationPage() {
  return (
    <>
      <PageHeader title="Run Validation" description="Check current inventory for issues before generating configuration." />
      <RunValidationView />
    </>
  )
}
