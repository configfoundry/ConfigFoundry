import { PageHeader } from '@/components/common/PageHeader'
import { PoliciesView } from '@/modules/administration/PoliciesView'

// Tab strip removed -- see system/global-settings/page.tsx. Same real,
// backend-connected IP Policies component as before, just relocated.
export default function SystemSecurityPoliciesPage() {
  return (
    <>
      <PageHeader title="Security Policies" description="IP allow/deny rules enforced for inbound access." />
      <PoliciesView />
    </>
  )
}
