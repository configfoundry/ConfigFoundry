'use client'

// ** React Import
import { useMemo } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

// ** React Query
import { useQuery } from '@tanstack/react-query'

// ** Icon Imports
import Icon from '@/@core/components/icon'

// ** Type Import
import { Settings } from '@/@core/context/settingsContext'
import type { ThemeColor } from '@/@core/layouts/types'
import type { AuditEntry } from '@/lib/types'

// ** Components
// NOTE: this is a port of Vuexy's layouts/components/vertical/AppBarContent.tsx.
// Still dropped: LanguageDropdown (no i18n system exists in ConfigFoundry --
// not a data problem, an entire missing subsystem, out of scope for a UI
// pass). Everything else vendor has is now present, backed by real
// ConfigFoundry data instead of vendor's hardcoded demo arrays:
//  - Autocomplete (search): see layouts/components/vertical/Autocomplete.tsx
//    for what's real vs. intentionally deferred (client-side quick-link
//    filter now, live cross-entity search later).
//  - ShortcutsDropdown: real quick links from getPermittedQuickLinks(), the
//    same permission-filtered nav data the sidebar uses.
//  - NotificationDropdown: real api.getAudit() rows, gated on the same
//    'audit:read' permission that hides Audit Logs from the sidebar --
//    notifications ARE audit data here, so the same permission applies.
import ModeToggler from '@/@core/layouts/components/shared-components/ModeToggler'
import UserDropdown from '@/@core/layouts/components/shared-components/UserDropdown'
import ShortcutsDropdown from '@/@core/layouts/components/shared-components/ShortcutsDropdown'
import NotificationDropdown, {
  type NotificationsType
} from '@/@core/layouts/components/shared-components/NotificationDropdown'
import Autocomplete from './Autocomplete'
// Real ConfigFoundry logic, not a Vuexy component -- Vuexy ships breadcrumb
// *styling* (@core/theme/overrides/breadcrumbs.ts) but no breadcrumb-trail
// component. Kept as-is per your call to re-skin rather than drop it.
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'

// ** Hooks
import { useAuth } from '@/providers/AuthProvider'
import { api } from '@/lib/api'
import { getPermittedQuickLinks } from '@/navigation/vertical'

interface Props {
  hidden: boolean
  settings: Settings
  toggleNavVisibility: () => void
  saveSettings: (values: Settings) => void
}

/** Same 4-bucket action->color/icon classification RecentActivity.tsx uses
 * for its Dashboard timeline dots -- duplicated (not imported) since layout
 * code shouldn't depend on a page module, and it's only 5 lines. */
function notificationVisual(action: string): { color: ThemeColor; icon: string } {
  const a = action.toLowerCase()
  if (a.startsWith('delete')) return { color: 'error', icon: 'tabler:trash' }
  if (a.startsWith('create') || a.startsWith('add')) return { color: 'success', icon: 'tabler:plus' }
  if (a.startsWith('update') || a.startsWith('edit')) return { color: 'info', icon: 'tabler:edit' }
  if (a.startsWith('generate')) return { color: 'primary', icon: 'tabler:file-code' }
  return { color: 'secondary', icon: 'tabler:list-details' }
}

function fmtMeta(ts: string | null | undefined) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function toNotification(entry: AuditEntry): NotificationsType {
  const { color, icon } = notificationVisual(entry.action)

  return {
    meta: fmtMeta(entry.ts),
    title: entry.action,
    subtitle: `${entry.actor ?? 'system'}${entry.entity ? ` · ${entry.entity}` : ''}`,
    avatarIcon: <Icon icon={icon} />,
    avatarColor: color
  }
}

const AppBarContent = (props: Props) => {
  // ** Props
  const { hidden, settings, saveSettings, toggleNavVisibility } = props

  // ** Hooks
  const { user, hasPermission } = useAuth()
  const canReadAudit = hasPermission('audit:read')

  const { data: auditData } = useQuery({
    queryKey: ['audit', 20],
    queryFn: () => api.getAudit(20),
    enabled: canReadAudit,
    refetchInterval: 60_000
  })

  const notifications = useMemo(
    () => (auditData?.entries ?? []).map(toNotification),
    [auditData]
  )

  const shortcuts = useMemo(() => getPermittedQuickLinks(hasPermission), [hasPermission])

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box className='actions-left' sx={{ mr: 2, display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {hidden && !settings.navHidden ? (
          <IconButton color='inherit' sx={{ ml: -2.75, mr: 2 }} onClick={toggleNavVisibility}>
            <Icon fontSize='1.5rem' icon='tabler:menu-2' />
          </IconButton>
        ) : null}
        {user && <Autocomplete hidden={hidden} settings={settings} />}
        <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
          <Breadcrumbs />
        </Box>
      </Box>
      <Box className='actions-right' sx={{ display: 'flex', alignItems: 'center' }}>
        <ModeToggler settings={settings} saveSettings={saveSettings} />
        {user && (
          <>
            <ShortcutsDropdown settings={settings} shortcuts={shortcuts} />
            {canReadAudit && <NotificationDropdown settings={settings} notifications={notifications} />}
          </>
        )}
        <UserDropdown settings={settings} />
      </Box>
    </Box>
  )
}

export default AppBarContent
