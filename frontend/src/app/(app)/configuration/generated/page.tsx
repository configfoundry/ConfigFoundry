import { PageHeader } from '@/components/common/PageHeader'
import { GenerationHistoryList } from '@/components/common/GenerationHistoryList'

// Tab strip removed -- see configuration/generate/page.tsx. Retitled from
// "Generated Configurations" to "Generated Files" to match the nav.
export default function GeneratedConfigurationsPage() {
  return (
    <>
      <PageHeader title="Generated Files" description="Browse and download files produced by past Generate Configuration runs." />
      <GenerationHistoryList />
    </>
  )
}
