import { GenerationHistoryList } from '@/components/common/GenerationHistoryList'
import { PageHeader } from '@/components/common/PageHeader'

// Tab strip removed -- see validation/run/page.tsx. GenerationHistoryList
// still reads the same shared /history feed (see that component's header).
export default function ValidationHistoryPage() {
  return (
    <>
      <PageHeader
        title="Validation History"
        description="Every Run Validation / Generate Configuration call is logged here."
      />
      <GenerationHistoryList
        emptyTitle="No validation runs yet"
        emptySub="Run validation from the Validation section to see history here."
      />
    </>
  )
}
