'use client'

import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import {
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from '@mui/x-data-grid'

export interface DataGridToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  rightActions?: ReactNode
}

/**
 * Shared Data Grid toolbar: quick search (feeds the page's own filtering
 * logic -- NOT the grid's built-in quick filter, so the exact same search
 * fields/behavior from the pre-migration pages is preserved) + built-in
 * column visibility / filter / density / CSV export controls + a slot for
 * page-specific actions (Import, Export XLSX, Add).
 */
export function DataGridToolbar({ searchValue, onSearchChange, searchPlaceholder, rightActions }: DataGridToolbarProps) {
  return (
    <GridToolbarContainer sx={{ p: 1.5, gap: 1, flexWrap: 'wrap' }}>
      <TextField
        size="small"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder ?? 'Search…'}
        sx={{ minWidth: 240 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <Box sx={{ flexGrow: 1 }} />
      {rightActions}
    </GridToolbarContainer>
  )
}
