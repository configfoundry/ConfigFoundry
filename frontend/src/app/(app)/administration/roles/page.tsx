import { PageHeader } from '@/components/common/PageHeader'
import { RolesView } from '@/modules/administration/RolesView'

// Tab strip removed -- see administration/users/page.tsx.
export default function RolesAdminPage() {
  return (
    <>
      <PageHeader title="Roles" description="Permission sets assignable to users." />
      <RolesView />
    </>
  )
}
