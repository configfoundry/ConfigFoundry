'use client'

/**
 * Personal Settings -- Account Center workspace home page.
 *
 * Previously a placeholder single-column list of navigation links (see git
 * history). Rebuilt as a real "Account Center" per the redesign brief:
 * Profile Summary, Quick Actions, Security Summary, Preferences Summary,
 * Recent Account Activity, and a Danger Zone. See
 * modules/account/AccountCenterView.tsx for the full implementation and
 * data-sourcing notes.
 *
 * Nothing about routing or the sidebar changed in this pass -- every
 * existing account page (Profile/Preferences/Sessions/Theme/Notifications/
 * MFA/API Tokens) is unchanged and still reachable from here.
 */
import { PageHeader } from '@/components/common/PageHeader'
import { AccountCenterView } from '@/modules/account/AccountCenterView'

export default function PersonalSettingsPage() {
  return (
    <>
      <PageHeader title="Personal Settings" description="Your profile, security, and preferences at a glance." />
      <AccountCenterView />
    </>
  )
}
