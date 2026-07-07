import { PageHeader } from '@/components/common/PageHeader'
import { SubnetsView } from '@/modules/inventory/SubnetsView'

// Tab strip removed -- see infrastructure/devices/page.tsx for the pattern.
// Route renamed from /inventory/subnets as part of the Infrastructure IA
// rename.
export default function InfrastructureSubnetsPage() {
  return (
    <>
      <PageHeader title="Subnets" description="IP subnets available for device assignment." />
      <SubnetsView />
    </>
  )
}
