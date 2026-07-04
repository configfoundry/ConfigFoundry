import { PageHeader } from '@/components/common/PageHeader'
import { BandwidthView } from '@/modules/inventory/BandwidthView'

// Tab strip removed -- see inventory/devices/page.tsx for the pattern.
export default function InventoryBandwidthPage() {
  return (
    <>
      <PageHeader title="Bandwidth Profiles" description="Interface bandwidth caps applied during configuration generation." />
      <BandwidthView />
    </>
  )
}
