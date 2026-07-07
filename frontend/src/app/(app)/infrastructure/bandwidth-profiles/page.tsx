import { PageHeader } from '@/components/common/PageHeader'
import { BandwidthView } from '@/modules/inventory/BandwidthView'

// Tab strip removed -- see infrastructure/devices/page.tsx for the pattern.
// Route renamed from /inventory/bandwidth-profiles as part of the
// Infrastructure IA rename.
export default function InfrastructureBandwidthPage() {
  return (
    <>
      <PageHeader title="Bandwidth Profiles" description="Interface bandwidth caps applied during configuration generation." />
      <BandwidthView />
    </>
  )
}
