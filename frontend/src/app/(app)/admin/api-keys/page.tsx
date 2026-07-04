import { AdminTabs } from '@/modules/administration/AdminTabs'
import { ApiKeysView } from '@/modules/administration/ApiKeysView'

// Thin route file per the modules/<name> architecture. Route path unchanged (/admin/api-keys).
export default function ApiKeysAdminPage() {
  return (
    <>
      <AdminTabs />
      <ApiKeysView />
    </>
  )
}
