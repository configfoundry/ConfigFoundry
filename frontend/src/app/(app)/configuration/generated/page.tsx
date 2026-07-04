import { PageHeader } from '@/components/common/PageHeader'
import { GenerationHistoryList } from '@/components/common/GenerationHistoryList'

// Tab strip removed -- see configuration/generate/page.tsx.
export default function GeneratedConfigurationsPage() {
  return (
    <>
      <PageHeader title="Generated Configurations" description="Browse and download files produced by past Generate Configuration runs." />
      <GenerationHistoryList />
    </>
  )
}
