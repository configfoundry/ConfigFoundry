import { GenerationHistoryList } from '@/components/common/GenerationHistoryList'
import { PageHeader } from '@/components/common/PageHeader'

// Tab strip removed -- see validation/run/page.tsx. GenerationHistoryList
// still reads the same shared /history feed (see that component's header).
// Retitled from "Validation History" to "History" to match the nav --
// breadcrumbs still read "Validation / History" so the context isn't lost.
export default function ValidationHistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Every Run Validation / Generate Configuration call is logged here."
      />
      <GenerationHistoryList
        emptyTitle="No validation runs yet"
        emptySub="Run validation from the Validation section to see history here."
      />
    </>
  )
}
