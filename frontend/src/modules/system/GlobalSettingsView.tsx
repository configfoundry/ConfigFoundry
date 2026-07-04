'use client'

/**
 * Global Settings -- MUI rewrite of the Tags + Lists sections from the old
 * app/(app)/settings/page.tsx (Security section moved to Account, see
 * modules/account/*). Same api.getTags/upsertTag/deleteTag and
 * api.getLists/setList calls, same query keys, same validation -- only the
 * markup changed from hand-rolled CSS classes to Vuexy's Card/Table/Dialog
 * primitives.
 */
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { api } from '@/lib/api'
import type { TagDef } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/components/ui/Toast'
import Icon from '@/@core/components/icon'

const SCOPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'devices', label: 'Devices' },
  { key: 'bandwidth', label: 'Bandwidth Capping' },
  { key: 'subnets', label: 'Subnets' },
]

// ---------------------------------------------------------------------------
// Tag dialog
// ---------------------------------------------------------------------------
function TagDialog({ tag, onClose, onSave }: { tag: Partial<TagDef> | null; onClose: () => void; onSave: (t: Partial<TagDef>) => void }) {
  const isNew = !tag?.id
  const [form, setForm] = useState({
    id: tag?.id ?? '',
    name: tag?.name ?? '',
    label: tag?.label ?? '',
    type: (tag?.type ?? 'enum') as TagDef['type'],
    required: tag?.required ?? false,
    scopes: tag?.scopes ?? ([] as string[]),
    valuesText: (tag?.values ?? []).join('\n'),
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }
  function toggleScope(key: string) {
    setForm(f => ({ ...f, scopes: f.scopes.includes(key) ? f.scopes.filter(s => s !== key) : [...f.scopes, key] }))
  }
  function save() {
    const values = form.valuesText.split('\n').map(v => v.trim()).filter(Boolean)
    const out: Partial<TagDef> = { name: form.name || form.id, label: form.label || form.name || form.id, type: form.type, required: form.required, scopes: form.scopes }
    if (form.id) out.id = form.id
    if (form.type === 'enum') out.values = values
    onSave(out)
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isNew ? 'New Tag' : 'Edit Tag'}</DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ mt: 1 }}>
          <TextField
            label="Tag name"
            required
            fullWidth
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Country, Environment, Business Unit"
            disabled={!isNew}
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Applies to</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {SCOPE_OPTIONS.map(o => (
                <Chip
                  key={o.key}
                  label={o.label}
                  clickable
                  color={form.scopes.includes(o.key) ? 'primary' : 'default'}
                  variant={form.scopes.includes(o.key) ? 'filled' : 'outlined'}
                  onClick={() => toggleScope(o.key)}
                />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              A tag applying to multiple sections shares the same value list.
            </Typography>
          </Box>
          <TextField select label="Type" fullWidth value={form.type} onChange={e => set('type', e.target.value as TagDef['type'])}>
            <MenuItem value="enum">Enum (dropdown)</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="boolean">Boolean</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={form.required} onChange={e => set('required', e.target.checked)} />}
            label="Required field"
          />
          {form.type === 'enum' && (
            <TextField
              label="Values (one per line)"
              multiline
              minRows={5}
              fullWidth
              value={form.valuesText}
              onChange={e => set('valuesText', e.target.value)}
              placeholder={'APAC\nEMEA\nNAM\nLATAM'}
              helperText="You can also manage values on the Managed Lists tab after saving."
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!form.name && !form.id}>{isNew ? 'Add' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Tags section
// ---------------------------------------------------------------------------
function TagsSection() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editTag, setEditTag] = useState<Partial<TagDef> | null | 'new'>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['tags'], queryFn: () => api.getTags() })

  const saveMut = useMutation({
    mutationFn: (t: Partial<TagDef>) => api.upsertTag(t),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setEditTag(null); toast('Tag saved', 'success') },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) => api.deleteTag(id, undefined, force),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast('Tag deleted', 'success') },
    onError: (e) => {
      const err = e as Error & { data?: { dependents?: string[] } }
      if (err.message.includes('in use')) {
        toast('This tag is in use by devices. Remove it from those devices first.', 'warn')
      } else {
        toast(err.message, 'error')
      }
    },
  })

  if (isLoading) return <Skeleton variant="rounded" height={240} />
  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>{(error as Error).message}</Alert>

  const tags = data?.tagDefs ?? []

  return (
    <Card>
      <CardHeader
        title="Tag Definitions"
        subheader={`${tags.length} tag definition${tags.length !== 1 ? 's' : ''}`}
        action={<Button variant="contained" startIcon={<Icon icon="tabler:plus" />} onClick={() => setEditTag('new')}>Add Tag</Button>}
      />
      <Divider />
      {tags.length === 0 ? (
        <CardContent>
          <EmptyState title="No tags defined" sub="Tags let you add custom fields to devices (e.g. Collector Region, Role)."
            action={<Button variant="contained" onClick={() => setEditTag('new')}>Add Tag</Button>} />
        </CardContent>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Applies to</TableCell>
              <TableCell>Values</TableCell>
              <TableCell>Required</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {tags.map(t => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Typography variant="body2">{t.label ?? t.name}</Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">{t.id}</Typography>
                </TableCell>
                <TableCell><Chip size="small" label={t.type} variant="outlined" /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(t.scopes ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    ) : (
                      (t.scopes ?? []).map(s => (
                        <Chip key={s} size="small" color="info" variant="outlined" label={SCOPE_OPTIONS.find(o => o.key === s)?.label ?? s} />
                      ))
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {t.type === 'enum'
                      ? (t.values ?? []).slice(0, 4).join(', ') + ((t.values?.length ?? 0) > 4 ? ` +${(t.values?.length ?? 0) - 4}` : '')
                      : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {t.required ? <Chip size="small" color="error" label="Required" /> : <Typography variant="body2" color="text.disabled">No</Typography>}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setEditTag(t)}><Icon icon="tabler:edit" fontSize="1rem" /></IconButton>
                  <IconButton
                    size="small"
                    onClick={() => { if (confirm(`Delete tag "${t.id}"?`)) deleteMut.mutate({ id: t.id, force: false }) }}
                  >
                    <Icon icon="tabler:trash" fontSize="1rem" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editTag !== null && (
        <TagDialog
          tag={typeof editTag === 'string' ? null : editTag}
          onClose={() => setEditTag(null)}
          onSave={t => saveMut.mutate(t)}
        />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Lists section
// ---------------------------------------------------------------------------
function ListsSection() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editList, setEditList] = useState<string | null>(null)
  const [itemsText, setItemsText] = useState('')

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['lists'], queryFn: () => api.getLists() })

  const saveMut = useMutation({
    mutationFn: ({ name, items }: { name: string; items: string[] }) => api.setList(name, items),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists'] }); setEditList(null); toast('List saved', 'success') },
    onError: (e) => toast((e as Error).message, 'error'),
  })

  const startEdit = useCallback((name: string, items: string[]) => { setEditList(name); setItemsText(items.join('\n')) }, [])

  function saveList() {
    if (!editList) return
    saveMut.mutate({ name: editList, items: itemsText.split('\n').map(s => s.trim()).filter(Boolean) })
  }

  if (isLoading) return <Skeleton variant="rounded" height={240} />
  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>{(error as Error).message}</Alert>

  const lists = Object.entries(data?.lists ?? {})

  return (
    <>
      {lists.length === 0 ? (
        <Card><CardContent><EmptyState title="No managed lists" sub="Lists like Collector Regions will appear here." /></CardContent></Card>
      ) : (
        <Stack spacing={3}>
          {lists.map(([name, items]) => (
            <Card key={name}>
              <CardHeader
                title={name.replace(/_/g, ' ')}
                sx={{ textTransform: 'capitalize' }}
                action={<Button size="small" variant="outlined" onClick={() => startEdit(name, items)}>Edit</Button>}
              />
              <Divider />
              <CardContent>
                {items.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No items</Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {items.map(item => <Chip key={item} size="small" label={item} variant="outlined" />)}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={!!editList} onClose={() => setEditList(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit List: {editList?.replace(/_/g, ' ')}</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            label="Items (one per line)"
            multiline
            minRows={10}
            fullWidth
            value={itemsText}
            onChange={e => setItemsText(e.target.value)}
            placeholder={'APAC\nEMEA\nNAM'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditList(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveList}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function GlobalSettingsView() {
  const [tab, setTab] = useState<'tags' | 'lists'>('tags')

  return (
    <Box>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="tags" label="Tag Definitions" />
        <Tab value="lists" label="Managed Lists" />
      </Tabs>
      {tab === 'tags' && <TagsSection />}
      {tab === 'lists' && <ListsSection />}
    </Box>
  )
}
