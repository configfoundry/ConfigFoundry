// ---------------------------------------------------------------------------
// Generates src/iconify-bundle/tabler-icons.json -- a small, offline subset
// of the tabler icon set containing ONLY the icons this app actually uses.
//
// Why this exists: @iconify/react's <Icon icon="tabler:x" /> resolves icons
// it doesn't already have by calling out to api.iconify.design (and mirrors
// api.unisvg.com / api.simplesvg.com) at runtime. ConfigFoundry's backend CSP
// (core/security/middleware.py) sets `connect-src 'self'`, so those calls are
// blocked -- icons would silently fail to render in production. This script
// pre-bundles the icons at build time instead, matching Vuexy's own
// documented approach (their src/iconify-bundle/bundle-icons-react.ts does
// the same thing, just with a fancier SVGO cleanup pipeline this app doesn't
// need since @iconify-json's icons are already clean).
//
// Run manually whenever a new tabler:* icon name is introduced:
//   node scripts/generate-icon-bundle.mjs
// (CI/build should also run this before `next build` once this project has a
// working build pipeline again -- see the icon list below.)
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getIcons } from '@iconify/utils'
import tablerIconSet from '@iconify-json/tabler/icons.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))

// Keep this list in sync with every icon='tabler:...' / icon="tabler:..."
// string used anywhere under src/. Re-run this script after adding any new one.
const ICON_NAMES = [
  'access-point',
  'alert-triangle',
  'antenna',
  'apps',
  'arrow-right',
  'arrow-up',
  'bell',
  'bell-ringing',
  'book-2',
  'box',
  'check',
  'checklist',
  'chevron-left',
  'chevron-right',
  'circle',
  'circle-dot',
  'corner-down-left',
  'cpu',
  'database',
  'device-unknown',
  'dots-vertical',
  'download',
  'edit',
  'eye',
  'eye-off',
  'file-code',
  'file-off',
  'file-upload',
  'firewall-flame',
  'gauge',
  'help-circle',
  'history',
  'key',
  'layout-grid-add',
  'list-details',
  'load-balancer',
  'lock',
  'logout',
  'menu-2',
  'moon-stars',
  'plus',
  'receipt-2',
  'router',
  'search',
  'separator',
  'server-2',
  'settings',
  'shield-lock',
  'smart-home',
  'sun',
  'tags',
  'topology-star',
  'topology-star-3',
  'trash',
  'upload',
  'users',
  'wand',
  'x',
]

const subset = getIcons(tablerIconSet, ICON_NAMES)

if (!subset) {
  throw new Error('getIcons() returned nothing -- check ICON_NAMES against @iconify-json/tabler/icons.json')
}

const missing = ICON_NAMES.filter(name => !subset.icons[name])
if (missing.length) {
  throw new Error(`Icon(s) not found in tabler set: ${missing.join(', ')}`)
}

const outDir = join(__dirname, '..', 'src', 'iconify-bundle')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'tabler-icons.json'), JSON.stringify(subset), 'utf-8')

console.log(`Wrote ${Object.keys(subset.icons).length} icons to src/iconify-bundle/tabler-icons.json`)
