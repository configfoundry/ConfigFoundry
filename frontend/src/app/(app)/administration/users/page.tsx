import { PageHeader } from '@/components/common/PageHeader'
import { UsersView } from '@/modules/administration/UsersView'

// Tab strip removed -- the sidebar's Administration nav group already
// covers Users/Roles/API Keys/Audit Logs navigation. UsersView's own "Add
// User" action stays inside its toolbar -- not duplicated here.
export default function UsersAdminPage() {
  return (
    <>
      <PageHeader title="Users" description="People with access to this ConfigFoundry instance and their roles." />
      <UsersView />
    </>
  )
}
