import { PageHeader } from '@/components/common/PageHeader'
import { TemplatesView } from '@/modules/inventory/TemplatesView'

// Tab strip removed -- see inventory/devices/page.tsx for the pattern.
export default function InventoryTemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" description="Reusable configuration templates applied when generating device output." />
      <TemplatesView />
    </>
  )
}
