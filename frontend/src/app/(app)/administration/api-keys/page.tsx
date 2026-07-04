import { PageHeader } from '@/components/common/PageHeader'
import { ApiKeysView } from '@/modules/administration/ApiKeysView'

// Tab strip removed -- see administration/users/page.tsx.
export default function ApiKeysAdminPage() {
  return (
    <>
      <PageHeader title="API Keys" description="Organization-wide API keys for programmatic access." />
      <ApiKeysView />
    </>
  )
}
