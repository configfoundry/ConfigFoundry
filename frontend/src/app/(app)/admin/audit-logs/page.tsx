import { AdminTabs } from '@/modules/administration/AdminTabs'
import { AuditLogsView } from '@/modules/administration/AuditLogsView'

// NEW route (/admin/audit-logs) -- see AuditLogsView.tsx for why this is
// considered in-scope (existing, already-used GET /api/v1/audit endpoint;
// no new backend code).
export default function AuditLogsAdminPage() {
  return (
    <>
      <AdminTabs />
      <AuditLogsView />
    </>
  )
}
