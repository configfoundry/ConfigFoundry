import { AdminTabs } from '@/modules/administration/AdminTabs'
import { PoliciesView } from '@/modules/administration/PoliciesView'

// Thin route file per the modules/<name> architecture. Route path unchanged (/admin/policies).
export default function PoliciesAdminPage() {
  return (
    <>
      <AdminTabs />
      <PoliciesView />
    </>
  )
}
