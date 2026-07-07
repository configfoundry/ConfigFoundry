'use client'

// ** React Imports
import { ElementType } from 'react'

// ** Next Imports
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

// ** MUI Imports
import Chip from '@mui/material/Chip'
import ListItem from '@mui/material/ListItem'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Box, { BoxProps } from '@mui/material/Box'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemButton, { ListItemButtonProps } from '@mui/material/ListItemButton'

// ** Configs Import
import themeConfig from '@/configs/themeConfig'

// ** Types
import { NavLink, NavGroup } from '@/@core/layouts/types'
import { Settings } from '@/@core/context/settingsContext'

// ** Custom Components Imports
// NOTE: Vuexy's UserIcon/Translations/CanViewNavLink wrappers were dropped here --
// UserIcon was a trivial pass-through to Icon (no local-SVG variant in use), Translations
// needed react-i18next (ConfigFoundry has no i18n), and CanViewNavLink is a CASL ACL guard
// for a permission scheme ConfigFoundry doesn't use. Permission filtering already happens
// via hasPermission() before items ever reach this component (see navigation/vertical/index.ts).
import Icon from '@/@core/components/icon'

// ** Util Imports
import { hexToRGBA } from '@/@core/utils/hex-to-rgba'
import { handleURLQueries } from '@/@core/layouts/utils'

interface Props {
  parent?: boolean
  item: NavLink
  navHover?: boolean
  settings: Settings
  navVisible?: boolean
  collapsedNavWidth: number
  navigationBorderWidth: number
  toggleNavVisibility: () => void
  isSubToSub?: NavGroup | undefined
}

// ** Styled Components
const MenuNavLink = styled(ListItemButton)<
  ListItemButtonProps & { component?: ElementType; href: string; target?: '_blank' | undefined }
>(({ theme }) => ({
  width: '100%',
  marginLeft: theme.spacing(3.5),
  marginRight: theme.spacing(3.5),
  borderRadius: theme.shape.borderRadius,
  transition: 'padding-left .25s ease-in-out, padding-right .25s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  '&.active': {
    '&, &:hover': {
      boxShadow: `0px 2px 6px ${hexToRGBA(theme.palette.primary.main, 0.48)}`,
      background: `linear-gradient(72.47deg, ${
        theme.direction === 'ltr' ? theme.palette.primary.main : hexToRGBA(theme.palette.primary.main, 0.7)
      } 22.16%, ${
        theme.direction === 'ltr' ? hexToRGBA(theme.palette.primary.main, 0.7) : theme.palette.primary.main
      } 76.47%)`,
      '&.Mui-focusVisible': {
        background: `linear-gradient(72.47deg, ${theme.palette.primary.dark} 22.16%, ${hexToRGBA(
          theme.palette.primary.dark,
          0.7
        )} 76.47%)`
      }
    },
    '& .MuiTypography-root, & svg': {
      color: `${theme.palette.common.white} !important`
    }
  }
}))

const MenuItemTextMetaWrapper = styled(Box)<BoxProps>(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  justifyContent: 'space-between',
  transition: 'opacity .25s ease-in-out',
  ...(themeConfig.menuTextTruncate && { overflow: 'hidden' })
}))

const VerticalNavLink = ({
  item,
  parent,
  navHover,
  settings,
  navVisible,
  isSubToSub,
  collapsedNavWidth,
  toggleNavVisibility,
  navigationBorderWidth
}: Props) => {
  // ** Hooks
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ** Vars
  const { navCollapsed } = settings

  const icon = parent && !item.icon ? themeConfig.navSubItemIcon : item.icon

  // ConfigFoundry serves the frontend as a Next.js static export
  // (output: 'export'), which always resolves routes to a trailing-slash
  // URL (e.g. /inventory/devices/) -- but every href in navigation/vertical/
  // index.ts is written without one (/inventory/devices), matching how
  // they're used as Next <Link> targets elsewhere in the app. usePathname()
  // reflects the real, trailing-slash URL, so the vendor's original strict
  // `pathname === item.path` check silently never matched anything: no
  // leaf nav item has ever shown its active/highlighted state. Stripping a
  // single trailing slash from both sides before comparing (root `/` is
  // left alone) fixes this without touching the href values used
  // everywhere else for actual navigation.
  const stripTrailingSlash = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)

  const isNavLinkActive = () => {
    if (
      stripTrailingSlash(pathname) === stripTrailingSlash(item.path ?? '') ||
      handleURLQueries(pathname, searchParams, item.path)
    ) {
      return true
    } else {
      return false
    }
  }

  return (
    <>
      <ListItem
        disablePadding
        className='nav-link'
        disabled={item.disabled || false}
        sx={{ mt: 1, px: '0 !important' }}
      >
        <MenuNavLink
          component={Link}
          {...(item.disabled && { tabIndex: -1 })}
          className={isNavLinkActive() ? 'active' : ''}
          href={item.path === undefined ? '/' : `${item.path}`}
          {...(item.openInNewTab ? { target: '_blank' } : null)}
          onClick={e => {
            if (item.path === undefined) {
              e.preventDefault()
              e.stopPropagation()
            }
            if (navVisible) {
              toggleNavVisibility()
            }
          }}
          sx={{
            py: 2,
            ...(item.disabled ? { pointerEvents: 'none' } : { cursor: 'pointer' }),
            px: navCollapsed && !navHover ? (collapsedNavWidth - navigationBorderWidth - 22 - 28) / 8 : 4,
            '& .MuiTypography-root, & svg': {
              color: 'text.secondary'
            }
          }}
        >
          <ListItemIcon
            sx={{
              transition: 'margin .25s ease-in-out',
              ...(navCollapsed && !navHover ? { mr: 0 } : { mr: 2 }),
              ...(parent ? { ml: 1.5, mr: 3.5 } : {}), // This line should be after (navCollapsed && !navHover) condition for proper styling
              '& svg': {
                fontSize: '0.625rem',
                ...(!parent ? { fontSize: '1.375rem' } : {}),
                ...(parent && item.icon ? { fontSize: '0.875rem' } : {})
              }
            }}
          >
            <Icon icon={icon as string} />
          </ListItemIcon>

          <MenuItemTextMetaWrapper
            sx={{
              ...(isSubToSub ? { ml: 2 } : {}),
              ...(navCollapsed && !navHover ? { opacity: 0 } : { opacity: 1 })
            }}
          >
            <Typography
              {...((themeConfig.menuTextTruncate || (!themeConfig.menuTextTruncate && navCollapsed && !navHover)) && {
                noWrap: true
              })}
            >
              {item.title}
            </Typography>
            {item.badgeContent ? (
              <Chip
                size='small'
                label={item.badgeContent}
                color={item.badgeColor || 'primary'}
                sx={{ height: 22, minWidth: 22, '& .MuiChip-label': { px: 1.5, textTransform: 'capitalize' } }}
              />
            ) : null}
          </MenuItemTextMetaWrapper>
        </MenuNavLink>
      </ListItem>
    </>
  )
}

export default VerticalNavLink
