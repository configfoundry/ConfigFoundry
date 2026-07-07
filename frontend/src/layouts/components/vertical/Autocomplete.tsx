'use client'

// ** React Imports
import { useEffect, useCallback, useRef, useState, ChangeEvent, useMemo } from 'react'

// ** Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import MuiDialog from '@mui/material/Dialog'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import ListItemButton from '@mui/material/ListItemButton'
import InputAdornment from '@mui/material/InputAdornment'
import { AutocompleteRenderInputParams } from '@mui/material/Autocomplete'

// ** Type Imports
import { Settings } from '@/@core/context/settingsContext'

// ** Icon Imports
import Icon from '@/@core/components/icon'

// ** Custom Component Import
import CustomAutocomplete from '@/@core/components/mui/autocomplete'

// ** Auth + real nav data
import { useAuth } from '@/providers/AuthProvider'
import { getPermittedQuickLinks, type QuickLink } from '@/navigation/vertical'

/**
 * ConfigFoundry adaptation of Vuexy's layouts/components/Autocomplete.tsx --
 * the UI shell (search icon + "Search (Ctrl+/)" label, full-screen/dialog
 * search, Ctrl+/ to open, ESC to close, grouped default-suggestions,
 * no-results fallback) is a straight port, unchanged.
 *
 * What's deliberately NOT ported: vendor's live search
 * (`axios.get('/app-bar/search', {params:{q}})`) -- that endpoint doesn't
 * exist in ConfigFoundry, and there's no equivalent cross-entity search API
 * yet, so results are a client-side filter over the same real,
 * permission-filtered quick links used by the sidebar and Shortcuts dropdown
 * (getPermittedQuickLinks), not a fabricated live-search result set. Once a
 * real search endpoint (devices/subnets/etc.) exists, wire it in here in
 * place of the client-side filter below -- the dialog/keyboard/rendering
 * plumbing already supports it exactly like vendor's did.
 */
interface Props {
  hidden: boolean
  settings: Settings
}

interface DefaultSuggestionsProps {
  setOpenDialog: (val: boolean) => void
}

interface NoResultProps {
  value: string
  setOpenDialog: (val: boolean) => void
}

// ** Styled Autocomplete component
const Autocomplete = styled(CustomAutocomplete)(({ theme }) => ({
  '& fieldset': {
    border: 0
  },
  '& + .MuiAutocomplete-popper': {
    '& .MuiAutocomplete-listbox': {
      paddingTop: 0,
      height: '100%',
      maxHeight: 'inherit',
      '& .MuiListSubheader-root': {
        top: 0,
        fontWeight: 400,
        lineHeight: '15px',
        fontSize: '0.75rem',
        letterSpacing: '1px',
        color: theme.palette.text.disabled
      }
    },
    '& .MuiPaper-root': {
      border: 0,
      height: '100%',
      borderRadius: 0,
      boxShadow: 'none !important'
    },
    '& .MuiListItem-root.suggestion': {
      padding: 0,
      '& .MuiListItemSecondaryAction-root': {
        display: 'flex'
      },
      '& .MuiListItemButton-root: hover': {
        backgroundColor: 'transparent'
      },
      '&:not(:hover)': {
        '& .MuiListItemSecondaryAction-root': {
          display: 'none'
        },
        '&.Mui-focused, &.Mui-focused.Mui-focusVisible:not(:hover)': {
          '& .MuiListItemSecondaryAction-root': {
            display: 'flex'
          }
        },
        [theme.breakpoints.down('sm')]: {
          '&.Mui-focused:not(.Mui-focusVisible) .MuiListItemSecondaryAction-root': {
            display: 'none'
          }
        }
      }
    },
    '& .MuiAutocomplete-noOptions': {
      display: 'grid',
      minHeight: '100%',
      alignItems: 'center',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: theme.spacing(10)
    }
  }
}))

// ** Styled Dialog component
const Dialog = styled(MuiDialog)({
  '& .MuiBackdrop-root': {
    backdropFilter: 'blur(4px)'
  },
  '& .MuiDialog-paper': {
    overflow: 'hidden',
    '&:not(.MuiDialog-paperFullScreen)': {
      height: '100%',
      maxHeight: 550
    }
  }
})

const NoResult = ({ value, setOpenDialog }: NoResultProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center' }}>
      <Box sx={{ mb: 2.5, color: 'text.primary' }}>
        <Icon icon='tabler:file-off' fontSize='5rem' />
      </Box>
      <Typography variant='h5' sx={{ mb: 11.5, wordWrap: 'break-word' }}>
        No results for{' '}
        <Typography variant='h5' component='span' sx={{ wordWrap: 'break-word' }}>
          {`"${value}"`}
        </Typography>
      </Typography>

      <Typography variant='body2' sx={{ mb: 2.5, color: 'text.disabled' }}>
        Try searching for
      </Typography>
      <List sx={{ py: 0 }}>
        {/* Real ConfigFoundry pages -- vendor's fallback list here linked to
            its fake ecommerce/user-profile/account-settings demo pages. */}
        <ListItem sx={{ py: 2 }} disablePadding onClick={() => setOpenDialog(false)}>
          <Box
            component={Link}
            href='/dashboard'
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              '&:hover > *': { color: 'primary.main' }
            }}
          >
            <Box sx={{ mr: 2.5, display: 'flex', color: 'text.primary' }}>
              <Icon icon='tabler:smart-home' />
            </Box>
            <Typography>Dashboard</Typography>
          </Box>
        </ListItem>
        <ListItem sx={{ py: 2 }} disablePadding onClick={() => setOpenDialog(false)}>
          <Box
            component={Link}
            href='/infrastructure/devices'
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              '&:hover > *': { color: 'primary.main' }
            }}
          >
            <Box sx={{ mr: 2.5, display: 'flex', color: 'text.primary' }}>
              <Icon icon='tabler:box' />
            </Box>
            <Typography>Infrastructure</Typography>
          </Box>
        </ListItem>
        <ListItem sx={{ py: 2 }} disablePadding onClick={() => setOpenDialog(false)}>
          <Box
            component={Link}
            href='/system/global-settings'
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              '&:hover > *': { color: 'primary.main' }
            }}
          >
            <Box sx={{ mr: 2.5, display: 'flex', color: 'text.primary' }}>
              <Icon icon='tabler:settings' />
            </Box>
            <Typography>Settings</Typography>
          </Box>
        </ListItem>
      </List>
    </Box>
  )
}

const DefaultSuggestions = ({
  setOpenDialog,
  quickLinks
}: DefaultSuggestionsProps & { quickLinks: QuickLink[] }) => {
  // Group the real quick links by their nav-section subtitle (Work,
  // Administration, ...) -- same idea as vendor's fixed category grouping,
  // just driven by real data instead of a hardcoded category map.
  const groups = useMemo(() => {
    const byGroup = new Map<string, QuickLink[]>()
    for (const link of quickLinks) {
      const bucket = byGroup.get(link.subtitle) ?? []
      bucket.push(link)
      byGroup.set(link.subtitle, bucket)
    }
    return Array.from(byGroup.entries())
  }, [quickLinks])

  return (
    <Grid container spacing={6} sx={{ ml: 0 }}>
      {groups.map(([groupLabel, links]) => (
        <Grid item xs={12} sm={6} key={groupLabel}>
          <Typography component='p' variant='overline' sx={{ lineHeight: 1.25, color: 'text.disabled' }}>
            {groupLabel}
          </Typography>
          <List sx={{ py: 2.5 }}>
            {links.map(link => (
              <ListItem key={link.url} sx={{ py: 2 }} disablePadding>
                <Box
                  component={Link}
                  href={link.url}
                  onClick={() => setOpenDialog(false)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '& svg': { mr: 2.5 },
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover > *': { color: 'primary.main' }
                  }}
                >
                  <Icon icon={link.icon} />
                  <Typography>{link.title}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Grid>
      ))}
    </Grid>
  )
}

const AutocompleteComponent = ({ hidden, settings }: Props) => {
  // ** States
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [searchValue, setSearchValue] = useState<string>('')
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  // ** Hooks & Vars
  const theme = useTheme()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const { layout } = settings
  const wrapper = useRef<HTMLDivElement>(null)
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'))

  const quickLinks = useMemo(() => getPermittedQuickLinks(hasPermission), [hasPermission])

  // Client-side filter over real quick links -- see file header comment for
  // why this isn't a live backend query.
  const options = useMemo(() => {
    if (!searchValue.length) return []
    const needle = searchValue.toLowerCase()
    return quickLinks.filter(link => link.title.toLowerCase().includes(needle))
  }, [searchValue, quickLinks])

  useEffect(() => {
    if (!openDialog) {
      setSearchValue('')
    }
  }, [openDialog])

  useEffect(() => {
    setIsMounted(true)

    return () => setIsMounted(false)
  }, [])

  // Handle click event on a list item in search result
  const handleOptionClick = (obj: QuickLink) => {
    setSearchValue('')
    setOpenDialog(false)
    if (obj.url) {
      router.push(obj.url)
    }
  }

  // Handle ESC & shortcut keys keydown events
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      // ** Shortcut keys to open searchbox (Ctrl + /)
      if (!openDialog && event.ctrlKey && event.which === 191) {
        setOpenDialog(true)
      }
    },
    [openDialog]
  )

  // Handle shortcut keys keyup events
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      // ** ESC key to close searchbox
      if (openDialog && event.keyCode === 27) {
        setOpenDialog(false)
      }
    },
    [openDialog]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyUp, handleKeydown])

  if (!isMounted) {
    return null
  } else {
    return (
      <Box
        ref={wrapper}
        onClick={() => !openDialog && setOpenDialog(true)}
        sx={{ display: 'flex', cursor: 'pointer', alignItems: 'center' }}
      >
        <IconButton color='inherit' sx={!hidden && layout === 'vertical' ? { mr: 0.5, ml: -2.75 } : {}}>
          <Icon fontSize='1.625rem' icon='tabler:search' />
        </IconButton>
        {!hidden && layout === 'vertical' ? (
          <Typography sx={{ userSelect: 'none', color: 'text.disabled' }}>Search (Ctrl+/)</Typography>
        ) : null}
        {openDialog && (
          <Dialog fullWidth open={openDialog} fullScreen={fullScreenDialog} onClose={() => setOpenDialog(false)}>
            <Box sx={{ top: 0, width: '100%', position: 'sticky' }}>
              <Autocomplete
                autoHighlight
                disablePortal
                options={options}
                id='appBar-search'
                isOptionEqualToValue={() => true}
                onInputChange={(event, value: string) => setSearchValue(value)}
                onChange={(event, obj) => handleOptionClick(obj as QuickLink)}
                noOptionsText={<NoResult value={searchValue} setOpenDialog={setOpenDialog} />}
                getOptionLabel={(option: QuickLink | unknown) => (option as QuickLink).title || ''}
                groupBy={(option: QuickLink | unknown) => (searchValue.length ? (option as QuickLink).subtitle : '')}
                sx={{
                  '& + .MuiAutocomplete-popper': {
                    ...(searchValue.length
                      ? {
                          overflow: 'auto',
                          maxHeight: 'calc(100vh - 69px)',
                          borderTop: `1px solid ${theme.palette.divider}`,
                          height: fullScreenDialog ? 'calc(100vh - 69px)' : 483,
                          '& .MuiListSubheader-root': { p: theme.spacing(3.75, 6, 1.75) }
                        }
                      : {
                          '& .MuiAutocomplete-listbox': { pb: 0 }
                        })
                  }
                }}
                renderInput={(params: AutocompleteRenderInputParams) => {
                  return (
                    <TextField
                      {...params}
                      value={searchValue}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchValue(event.target.value)}
                      inputRef={input => {
                        if (input) {
                          if (openDialog) {
                            input.focus()
                          } else {
                            input.blur()
                          }
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        sx: { p: `${theme.spacing(3.75, 6)} !important`, '&.Mui-focused': { boxShadow: 0 } },
                        startAdornment: (
                          <InputAdornment position='start' sx={{ color: 'text.primary' }}>
                            <Icon fontSize='1.5rem' icon='tabler:search' />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment
                            position='end'
                            onClick={() => setOpenDialog(false)}
                            sx={{ display: 'flex', cursor: 'pointer', alignItems: 'center' }}
                          >
                            {!hidden ? <Typography sx={{ mr: 2.5, color: 'text.disabled' }}>[esc]</Typography> : null}
                            <IconButton size='small' sx={{ p: 1 }}>
                              <Icon icon='tabler:x' fontSize='1.25rem' />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  )
                }}
                renderOption={(props, option: QuickLink | unknown) => {
                  return searchValue.length ? (
                    <ListItem
                      {...props}
                      key={(option as QuickLink).url}
                      className={`suggestion ${props.className}`}
                      onClick={() => handleOptionClick(option as QuickLink)}
                      secondaryAction={<Icon icon='tabler:corner-down-left' fontSize='1.25rem' />}
                      sx={{
                        '& .MuiListItemSecondaryAction-root': {
                          '& svg': {
                            cursor: 'pointer',
                            color: 'text.disabled'
                          }
                        }
                      }}
                    >
                      <ListItemButton
                        sx={{
                          py: 2,
                          px: `${theme.spacing(6)} !important`,
                          '& svg': { mr: 2.5, color: 'text.primary' }
                        }}
                      >
                        <Icon icon={(option as QuickLink).icon} />
                        <Typography>{(option as QuickLink).title}</Typography>
                      </ListItemButton>
                    </ListItem>
                  ) : null
                }}
              />
            </Box>
            {searchValue.length === 0 ? (
              <Box
                sx={{
                  p: 10,
                  display: 'grid',
                  overflow: 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  height: fullScreenDialog ? 'calc(100vh - 69px)' : '100%'
                }}
              >
                <DefaultSuggestions setOpenDialog={setOpenDialog} quickLinks={quickLinks} />
              </Box>
            ) : null}
          </Dialog>
        )}
      </Box>
    )
  }
}

export default AutocompleteComponent
