'use client'

/**
 * Shared permission picker used by the Roles and API Keys forms. UI-only
 * replacement for the old PermissionPicker (a plain checkbox list grouped
 * by category) -- same data shape (Permission[] grouped by `.category`),
 * same selected-codes Set / onToggle(code) contract, just rendered as a
 * real MUI X Tree View instead of stacked <label> checkboxes. One shared
 * component instead of three separate copies (New Role, Edit Permissions,
 * New API Key all used their own inline picker before).
 */
import { TreeView } from '@mui/x-tree-view/TreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { Permission } from '@/lib/types'

interface PermissionTreeProps {
  permissions: Permission[]
  selected: Set<string>
  onToggle: (code: string) => void
}

function groupByCategory(perms: Permission[]): Record<string, Permission[]> {
  const out: Record<string, Permission[]> = {}
  for (const p of perms) {
    const cat = p.category ?? 'Other'
    ;(out[cat] ??= []).push(p)
  }
  return out
}

export function PermissionTree({ permissions, selected, onToggle }: PermissionTreeProps) {
  const groups = groupByCategory(permissions)

  return (
    <TreeView
      sx={{ maxHeight: 360, overflowY: 'auto' }}
      multiSelect
      defaultExpanded={Object.keys(groups).map((c) => `cat:${c}`)}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
    >
      {Object.entries(groups).map(([cat, perms]) => {
        const selectedCount = perms.filter((p) => selected.has(p.code)).length
        return (
          <TreeItem
            key={cat}
            nodeId={`cat:${cat}`}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25 }}>
                <Checkbox
                  size="small"
                  checked={selectedCount === perms.length}
                  indeterminate={selectedCount > 0 && selectedCount < perms.length}
                  onClick={(e) => {
                    e.stopPropagation()
                    const allSelected = selectedCount === perms.length
                    perms.forEach((p) => {
                      const has = selected.has(p.code)
                      if (allSelected && has) onToggle(p.code)
                      if (!allSelected && !has) onToggle(p.code)
                    })
                  }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {cat}
                </Typography>
              </Box>
            }
          >
            {perms.map((p) => (
              <TreeItem
                key={p.code}
                nodeId={`perm:${p.code}`}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, py: 0.25 }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={selected.has(p.code)} onChange={() => onToggle(p.code)} sx={{ mt: -0.25 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {p.code}
                      </Typography>
                      {p.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {p.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            ))}
          </TreeItem>
        )
      })}
    </TreeView>
  )
}
