import { InventoryView } from '@/modules/inventory/InventoryView'

// Thin route file per the modules/<name> architecture -- implementation
// lives in modules/inventory/. Route path unchanged (/inventory).
export default function InventoryPage() {
  return <InventoryView />
}
