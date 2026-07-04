import { AdminTabs } from '@/modules/administration/AdminTabs'
import { UsersView } from '@/modules/administration/UsersView'

// Thin route file per the modules/<name> architecture. Route path unchanged (/admin/users).
export default function UsersAdminPage() {
  return (
    <>
      <AdminTabs />
      <UsersView />
    </>
  )
}
