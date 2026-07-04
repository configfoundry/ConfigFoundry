'use client'

// ** React Import
import { ElementType, forwardRef } from 'react'

// ** MUI Import
import Paper from '@mui/material/Paper'
import Autocomplete, { AutocompleteProps } from '@mui/material/Autocomplete'

// Verbatim port of Vuexy's @core/components/mui/autocomplete/index.tsx.
const CustomAutocomplete = forwardRef(
  <
    T,
    Multiple extends boolean | undefined,
    DisableClearable extends boolean | undefined,
    FreeSolo extends boolean | undefined,
    ChipComponent extends ElementType
  >(
    props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo, ChipComponent>,
    ref: any
  ) => {
    return (
      <Autocomplete
        {...props}
        ref={ref}
        PaperComponent={props => <Paper {...props} className='custom-autocomplete-paper' />}
      />
    )
  }
) as typeof Autocomplete & { displayName?: string }

// react/display-name -- required by this project's lint config for
// forwardRef components; vendor source didn't set one (same fix already
// applied to CustomTextField/CustomAvatar).
CustomAutocomplete.displayName = 'CustomAutocomplete'

export default CustomAutocomplete
