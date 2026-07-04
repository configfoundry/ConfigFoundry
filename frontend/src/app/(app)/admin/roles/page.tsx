import { AdminTabs } from '@/modules/administration/AdminTabs'
import { RolesView } from '@/modules/administration/RolesView'

// Thin route file per the modules/<name> architecture. Route path unchanged (/admin/roles).
export default function RolesAdminPage() {
  return (
    <>
      <AdminTabs />
      <RolesView />
    </>
  )
}
