import { PageHeader } from '@/components/common/PageHeader'
import { SystemSettingsScaffold } from '@/modules/system/SystemSettingsScaffold'

// Org-wide auth policy (session length, MFA enforcement, password rules).
// Per-user MFA enrollment already exists and is real -- see
// /account/mfa (api.auth.mfaEnrollBegin/Confirm/Disable). This page is the
// admin-facing POLICY layer on top of that, which has no backend yet.
export default function SystemAuthenticationPage() {
  return (
    <>
      <PageHeader
        title="Authentication"
        description="Organization-wide sign-in policy. Per-user MFA enrollment is managed under Account > Multi-Factor Authentication."
      />
      <SystemSettingsScaffold
        todoEndpoint="GET/PUT /api/v1/system/auth-policy"
        primaryActionLabel="Save Authentication Policy"
        sections={[
          {
            title: 'Session',
            fields: [
              { name: 'sessionLifetimeHours', label: 'Session lifetime (hours)', type: 'number', defaultValue: '12' },
              { name: 'refreshLifetimeDays', label: 'Refresh token lifetime (days)', type: 'number', defaultValue: '30' },
              { name: 'singleSessionPerUser', label: 'Limit to one active session per user', type: 'switch', defaultValue: false },
            ],
          },
          {
            title: 'Multi-Factor Authentication',
            fields: [
              { name: 'requireMfa', label: 'Require MFA for all users', type: 'switch', defaultValue: false },
              { name: 'requireMfaAdmins', label: 'Require MFA for admin roles only', type: 'switch', defaultValue: true },
            ],
          },
          {
            title: 'Password Policy',
            fields: [
              { name: 'minLength', label: 'Minimum length', type: 'number', defaultValue: '12' },
              { name: 'requireMixedCase', label: 'Require upper and lower case', type: 'switch', defaultValue: true },
              { name: 'requireNumber', label: 'Require a number', type: 'switch', defaultValue: true },
              { name: 'requireSymbol', label: 'Require a symbol', type: 'switch', defaultValue: false },
            ],
          },
        ]}
      />
    </>
  )
}
