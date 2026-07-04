'use client'

import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'

interface CodeViewerProps {
  filename: string
  content: string
  maxHeight?: number
}

// Lightweight, dependency-free YAML token coloring -- not a full grammar,
// just enough visual structure (keys / comments) for a "code viewer" feel
// without pulling in a syntax-highlighting package for one file type.
function highlightLine(line: string): ReactNode {
  const comment = line.match(/^(\s*)(#.*)$/)
  if (comment) {
    return (
      <>
        {comment[1]}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {comment[2]}
        </Box>
      </>
    )
  }
  const kv = line.match(/^(\s*(?:-\s*)?)([\w.\-/]+)(:)(.*)$/)
  if (kv) {
    return (
      <>
        {kv[1]}
        <Box component="span" sx={{ color: 'info.main' }}>
          {kv[2]}
        </Box>
        {kv[3]}
        <Box component="span" sx={{ color: 'success.main' }}>
          {kv[4]}
        </Box>
      </>
    )
  }
  return line || ' '
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CodeViewer({ filename, content, maxHeight = 420 }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const lines = content.split('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable -- silent no-op */
    }
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={copy}>
            {copied ? <CheckOutlinedIcon fontSize="small" /> : <ContentCopyOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton size="small" onClick={() => download(filename, content)}>
            <DownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          bgcolor: 'background.default',
        }}
      >
        {lines.map((line, i) => (
          <Box key={i} sx={{ display: 'flex' }}>
            <Box component="span" sx={{ color: 'text.disabled', width: 40, flexShrink: 0, userSelect: 'none', textAlign: 'right', pr: 1.5 }}>
              {i + 1}
            </Box>
            <Box component="span" sx={{ whiteSpace: 'pre' }}>
              {highlightLine(line)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
