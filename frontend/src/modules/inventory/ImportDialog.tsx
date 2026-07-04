'use client'

/**
 * Import-from-Excel dialog.
 *
 * UI-only port of the old ImportModal (removed from
 * app/(app)/inventory/page.tsx). Same three-step flow, same xlsx parsing
 * calls, same "merge vs replace" mode, same onImport(rows, mode) contract
 * -- only the presentation changed (centered Modal -> MUI Dialog).
 */
import { useState, type ChangeEvent } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Box from '@mui/material/Box'
import type { ImportMode } from '@/lib/types'

interface ImportDialogProps {
  open: boolean
  label: string
  onClose: () => void
  onImport: (rows: unknown[], mode: ImportMode) => void
}

export function ImportDialog({ open, label, onClose, onImport }: ImportDialogProps) {
  type XLSXModule = typeof import('xlsx')
  const [wb, setWb] = useState<ReturnType<XLSXModule['read']> | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buf, { type: 'array' })
      const names = workbook.SheetNames
      const preferred = names.find((n) => n.toLowerCase() === label.toLowerCase()) ?? names[0]
      setWb(workbook)
      setSheetNames(names)
      setSelectedSheet(preferred)
      const ws = workbook.Sheets[preferred]
      const rows = (await import('xlsx')).utils.sheet_to_json(ws, { defval: '' })
      setPreviewCount(rows.length)
    } catch {
      setParseError('Failed to read Excel file. Make sure it is a valid .xlsx or .xls file.')
    }
  }

  async function handleSheetChange(name: string) {
    setSelectedSheet(name)
    if (!wb) return
    const XLSX = await import('xlsx')
    const ws = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    setPreviewCount(rows.length)
  }

  async function handleSubmit() {
    if (!wb || !selectedSheet) return
    const XLSX = await import('xlsx')
    const ws = wb.Sheets[selectedSheet]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    onImport(rows, mode)
  }

  function handleClose() {
    setWb(null)
    setSheetNames([])
    setSelectedSheet('')
    setPreviewCount(null)
    setParseError(null)
    setFileName(null)
    setMode('merge')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import {label} from Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {parseError && <Alert severity="error">{parseError}</Alert>}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              1. Choose file
            </Typography>
            <Button variant="outlined" component="label" size="small">
              {fileName ?? 'Choose .xlsx/.xls file'}
              <input type="file" accept=".xlsx,.xls" hidden onChange={handleFile} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Tip: use &quot;Export XLSX&quot; first to get a template with the correct columns.
            </Typography>
          </Box>

          {sheetNames.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                2. Choose sheet
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel id="import-sheet-label">Sheet</InputLabel>
                <Select
                  labelId="import-sheet-label"
                  label="Sheet"
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                >
                  {sheetNames.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {previewCount !== null && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {previewCount} row(s) found in &ldquo;{selectedSheet}&rdquo;.
                </Typography>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {sheetNames.length > 0 ? '3.' : '2.'} Import mode
            </Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}>
              <FormControlLabel value="merge" control={<Radio size="small" />} label="Merge (add / update, keep existing)" />
              <FormControlLabel value="replace" control={<Radio size="small" />} label="Replace (clear all, then import)" />
            </RadioGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!wb}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}
