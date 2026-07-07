'use client'

// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Fab from '@mui/material/Fab'
import { styled } from '@mui/material/styles'
import Box, { BoxProps } from '@mui/material/Box'

// ** Icon Imports
import Icon from '@/@core/components/icon'

// ** Theme Config Import
import themeConfig from '@/configs/themeConfig'

// ** Type Import
import { LayoutProps } from '@/@core/layouts/types'

// ** Components
import AppBar from './components/vertical/appBar'
import Customizer from '@/@core/components/customizer'
import Navigation from './components/vertical/navigation'
import Footer from './components/shared-components/footer'
import ScrollToTop from '@/@core/components/scroll-to-top'

const VerticalLayoutWrapper = styled('div')({
  height: '100%',
  display: 'flex'
})

const MainContentWrapper = styled(Box)<BoxProps>({
  flexGrow: 1,
  minWidth: 0,
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column'
})

const ContentWrapper = styled('main')(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  padding: theme.spacing(6),
  transition: 'padding .25s ease-in-out',
  // Belt-and-suspenders: stops this element itself from ever growing the
  // page's scrollWidth. The real fix for the Grid-overflow issue below is
  // ContentClip, not this -- overflow-x here can't do the job alone (see
  // that component's comment for why).
  overflowX: 'hidden',
  [theme.breakpoints.down('sm')]: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4)
  }
}))

// MUI's <Grid container spacing={n}> shifts itself left/up via negative
// margin-left/margin-top and grows by the full spacing value via
// `width: calc(100% + Npx)` -- confirmed live via devtools: MUI only ever
// emits margin-left/margin-top for this, never margin-right/margin-bottom,
// and each Grid item only gets padding-left/padding-top to match. That's
// normal, intentional MUI behavior for producing even gutters *between*
// items -- but it means the container is always exactly `spacing` px wider
// than its parent, and every page in this app puts a `Grid container`
// directly inside ContentWrapper.
//
// Naively adding `overflow-x: hidden` to ContentWrapper itself does NOT
// fix this, despite looking like it should: CSS clips overflow at an
// element's own PADDING-BOX edge, and padding is *inside* that boundary by
// definition -- so a negative-margined child is free to render anywhere
// inside ContentWrapper's padding, including printing straight through the
// right-hand padding out to the outer edge, completely unclipped. That's
// exactly what was happening: cards were reading as flush against the
// scrollbar because the Grid's overflow was silently eating the padding
// meant to keep them off it, not because the padding value itself was
// wrong or asymmetric.
//
// The actual fix: an *unpadded* inner wrapper, placed inside
// ContentWrapper's padding rather than owning any padding of its own. With
// no padding and no negative margin of its own, this Box's edges settle
// exactly at ContentWrapper's already-inset content area -- then its own
// overflow-x: hidden clips the Grid's bleed right at that boundary,
// restoring the padding's actual visual effect on both sides symmetrically.
const ContentClip = styled(Box)({
  width: '100%',
  overflowX: 'hidden'
})

const VerticalLayout = (props: LayoutProps) => {
  // ** Props
  const { hidden, settings, children, scrollToTop, footerProps, contentHeightFixed, verticalLayoutProps } = props

  // ** Vars
  const { skin, navHidden, contentWidth } = settings
  const navigationBorderWidth = skin === 'bordered' ? 1 : 0
  const { navigationSize, disableCustomizer, collapsedNavigationSize } = themeConfig
  const navWidth = navigationSize
  const collapsedNavWidth = collapsedNavigationSize

  // ** States
  const [navVisible, setNavVisible] = useState<boolean>(false)

  // ** Toggle Functions
  const toggleNavVisibility = () => setNavVisible(!navVisible)

  return (
    <>
      <VerticalLayoutWrapper className='layout-wrapper'>
        {/* Navigation Menu */}
        {navHidden && !(navHidden && settings.lastLayout === 'horizontal') ? null : (
          <Navigation
            navWidth={navWidth}
            navVisible={navVisible}
            setNavVisible={setNavVisible}
            collapsedNavWidth={collapsedNavWidth}
            toggleNavVisibility={toggleNavVisibility}
            navigationBorderWidth={navigationBorderWidth}
            navMenuContent={verticalLayoutProps.navMenu.content}
            navMenuBranding={verticalLayoutProps.navMenu.branding}
            menuLockedIcon={verticalLayoutProps.navMenu.lockedIcon}
            verticalNavItems={verticalLayoutProps.navMenu.navItems}
            navMenuProps={verticalLayoutProps.navMenu.componentProps}
            menuUnlockedIcon={verticalLayoutProps.navMenu.unlockedIcon}
            afterNavMenuContent={verticalLayoutProps.navMenu.afterContent}
            beforeNavMenuContent={verticalLayoutProps.navMenu.beforeContent}
            {...props}
          />
        )}
        <MainContentWrapper
          className='layout-content-wrapper'
          sx={{ ...(contentHeightFixed && { maxHeight: '100vh' }) }}
        >
          {/* AppBar Component */}
          <AppBar
            toggleNavVisibility={toggleNavVisibility}
            appBarContent={verticalLayoutProps.appBar?.content}
            appBarProps={verticalLayoutProps.appBar?.componentProps}
            {...props}
          />

          {/* Content */}
          <ContentWrapper
            className='layout-page-content'
            sx={{
              ...(contentHeightFixed && {
                overflow: 'hidden',
                '& > :first-of-type': { height: '100%' }
              }),
              ...(contentWidth === 'boxed' && {
                mx: 'auto',
                // NOTE: this used to also carry a `@media (min-width:1200px):
                // { maxWidth: '100%' }` rule *after* this one. Both media
                // queries match simultaneously on any viewport >= 1440px, and
                // with equal CSS specificity the rule declared later in the
                // object wins -- so that second rule was silently canceling
                // this cap on every wide/ultrawide monitor, letting cards
                // stretch edge-to-edge with only the flat content padding
                // between them and the scrollbar. Removed; this is now the
                // only rule, matching the (correct, uncontested) single-rule
                // pattern already used by the AppBar and Footer, which never
                // had this bug.
                '@media (min-width:1440px)': { maxWidth: 1440 }
              })
            }}
          >
            <ContentClip>{children}</ContentClip>
          </ContentWrapper>

          {/* Footer Component */}
          <Footer footerStyles={footerProps?.sx} footerContent={footerProps?.content} {...props} />
        </MainContentWrapper>
      </VerticalLayoutWrapper>

      {/* Customizer */}
      {disableCustomizer || hidden ? null : <Customizer />}

      {/* Scroll to top button */}
      {scrollToTop ? (
        scrollToTop(props)
      ) : (
        <ScrollToTop className='mui-fixed'>
          <Fab color='primary' size='small' aria-label='scroll back to top'>
            <Icon icon='tabler:arrow-up' />
          </Fab>
        </ScrollToTop>
      )}
    </>
  )
}

export default VerticalLayout
