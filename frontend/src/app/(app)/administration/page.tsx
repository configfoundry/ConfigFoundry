'use client'

/**
 * Organization Settings -- workspace home page.
 *
 * Previously a placeholder collection of plain navigation-link cards (see
 * git history). Rebuilt as a real workspace home per the redesign brief:
 * Quick Actions, Organization Overview (real counts), Configuration
 * Categories (Identity & Access / Platform / Governance, each item annotated
 * with real status), Health Summary, and Recent Activity. See
 * modules/administration/OrganizationSettingsView.tsx for the full
 * implementation and data-sourcing notes.
 *
 * Nothing about routing, permissions, or the sidebar changed in this pass --
 * every existing admin page (Users/Roles/API Keys/Global Settings/
 * Authentication/Database/SMTP/Storage/Integrations/Licensing/Backup/
 * Security Policies/Audit Logs) is unchanged and still reachable from here.
 */
import { PageHeader } from '@/components/common/PageHeader'
import { OrganizationSettingsView } from '@/modules/administration/OrganizationSettingsView'

export default function OrganizationSettingsPage() {
  return (
    <>
      <PageHeader
        title="Organization Settings"
        description="Manage users, platform configuration, and audit history for your organization."
      />
      <OrganizationSettingsView />
    </>
  )
}
