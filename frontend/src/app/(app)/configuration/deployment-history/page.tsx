import { PageHeader } from '@/components/common/PageHeader'
import { GenerationHistoryList } from '@/components/common/GenerationHistoryList'

// Tab strip removed -- see configuration/generate/page.tsx. ConfigFoundry's
// deployment model is generate-then-manually-export -- there is no
// automated deploy step or separate deployment log in the backend, so this
// reads the same /history feed as Generated Files (see
// GenerationHistoryList.tsx header) rather than inventing deployment data
// that doesn't exist. Retitled from "Deployment History" to "Export
// History" to match the nav (a real "Deploy" step is on the roadmap as its
// own future nav placeholder -- see navigation/vertical/index.ts -- so this
// page's name shouldn't claim that ground until it exists).
export default function DeploymentHistoryPage() {
  return (
    <>
      <PageHeader
        title="Export History"
        description="ConfigFoundry doesn't track a separate deploy step yet -- each generation run here is what gets exported and deployed."
      />
      <GenerationHistoryList
        emptyTitle="No deployment history yet"
        emptySub="Generate configuration files from your validated inventory to see them here."
      />
    </>
  )
}
