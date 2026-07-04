import { PageHeader } from '@/components/common/PageHeader'
import { DevicesView } from '@/modules/inventory/DevicesView'

// Tab strip removed -- the sidebar's Inventory nav group already covers
// Devices/Bandwidth/Subnets/Templates navigation. Title lives here (not
// inside DevicesView) so it stays visible during DevicesView's own
// loading/error/empty branches without touching that component's logic.
// Devices' own "Add Device" action stays where it already is, inside the
// view's Search Filters toolbar -- not duplicated here.
export default function InventoryDevicesPage() {
  return (
    <>
      <PageHeader title="Devices" description="Network devices tracked in inventory, with region, config type, and status." />
      <DevicesView />
    </>
  )
}
