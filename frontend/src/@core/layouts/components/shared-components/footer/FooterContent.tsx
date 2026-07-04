'use client'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import { Theme } from '@mui/material/styles'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'

const StyledCompanyName = styled(Link)(({ theme }) => ({
  fontWeight: 500,
  textDecoration: 'none',
  color: `${theme.palette.primary.main} !important`
}))

const LinkStyled = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: `${theme.palette.text.secondary} !important`,
  '&:hover': {
    color: `${theme.palette.primary.main} !important`
  }
}))

const FooterContent = () => {
  // ** Var
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))

  // NOTE: vendor branding (Pixinvent / ThemeForest / their doc & support links)
  // replaced with real ConfigFoundry content -- same layout structure otherwise.
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ mr: 2, display: 'flex', color: 'text.secondary' }}>
        {`© ${new Date().getFullYear()} `}
        <Typography sx={{ ml: 1 }} component={StyledCompanyName} href='/'>
          ConfigFoundry
        </Typography>
        {`. All rights reserved.`}
      </Typography>
      {hidden ? null : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', '& :not(:last-child)': { mr: 4 } }}>
          <Typography
            target='_blank'
            component={LinkStyled}
            href='https://github.com/configfoundry/ConfigFoundry'
          >
            GitHub
          </Typography>
          <Typography component={LinkStyled} href='/documentation'>
            Documentation
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default FooterContent
