import { PageHeader } from '@/components/common/PageHeader'
import { TemplatesView } from '@/modules/inventory/TemplatesView'

// Tab strip removed -- see infrastructure/devices/page.tsx for the pattern.
// Route renamed from /inventory/templates as part of the Infrastructure IA
// rename.
export default function InfrastructureTemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" description="Reusable configuration templates applied when generating device output." />
      <TemplatesView />
    </>
  )
}
