'use client'

import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { OnboardingEmptyState } from '@/components/common/OnboardingEmptyState'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'

// ConfigFoundry's API keys (api.apiKeys.*) are org-wide, not per-user
// personal access tokens -- there's no owner/created_by field on
// ApiKeySummary (checked lib/types.ts and ApiKeysView.tsx). Rather than
// duplicate Administration > API Keys under a misleading "personal"
// framing, this links there (if permitted) and says plainly what's missing
// for a true per-user token model.
export default function AccountApiTokensPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('api:manage')

  return (
    <>
      <PageHeader title="API Tokens" description="Personal access tokens for programmatic use." />
      <Card>
        <OnboardingEmptyState
          icon="tabler:key"
          title="Personal tokens aren't separated from org-wide keys yet"
          description="ConfigFoundry's API keys are organization-wide today -- there's no owner field to scope a personal subset. TODO: add owner/created_by to the API key model to support real personal tokens here."
          primaryLabel={canManage ? 'Open API Keys' : 'No access to API Keys'}
          primaryIcon={canManage ? 'tabler:key' : 'tabler:lock'}
          onPrimary={() =>
            canManage
              ? router.push('/administration/api-keys')
              : toast('You don’t have permission to manage API keys.', 'warn')
          }
        />
      </Card>
    </>
  )
}
