import { PageHeader } from '@/components/common/PageHeader'
import { AuditLogsView } from '@/modules/administration/AuditLogsView'

// Tab strip removed -- see administration/users/page.tsx.
export default function AuditLogsAdminPage() {
  return (
    <>
      <PageHeader title="Audit Logs" description="A record of actions taken across this ConfigFoundry instance." />
      <AuditLogsView />
    </>
  )
}
