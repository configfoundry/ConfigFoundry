import { PageHeader } from '@/components/common/PageHeader'
import { FindingsView } from '@/modules/validation/FindingsView'

// Tab strip removed -- see validation/run/page.tsx.
export default function ValidationFindingsPage() {
  return (
    <>
      <PageHeader title="Findings" description="Issues detected by the most recent validation run, grouped by category." />
      <FindingsView />
    </>
  )
}
