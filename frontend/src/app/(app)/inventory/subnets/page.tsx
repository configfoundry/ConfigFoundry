import { PageHeader } from '@/components/common/PageHeader'
import { SubnetsView } from '@/modules/inventory/SubnetsView'

// Tab strip removed -- see inventory/devices/page.tsx for the pattern.
export default function InventorySubnetsPage() {
  return (
    <>
      <PageHeader title="Subnets" description="IP subnets available for device assignment." />
      <SubnetsView />
    </>
  )
}
