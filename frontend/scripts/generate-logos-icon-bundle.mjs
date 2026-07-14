// ---------------------------------------------------------------------------
// Generates src/iconify-bundle/logos-icons.json -- a small, offline subset
// of the official-brand "logos" icon set containing ONLY the monitoring
// platform logos the Monitoring Platforms hub (see
// src/modules/platforms/PlatformsView.tsx) actually uses.
//
// Same rationale as generate-icon-bundle.mjs (tabler): the backend's CSP
// (connect-src 'self') blocks any runtime call to api.iconify.design, and
// ADR-0003 requires full air-gap compatibility -- no logos may be fetched
// from a live CDN. These are the *official* brand marks distributed by the
// @iconify-json/logos package (sourced from each project's own published
// brand assets), bundled at build time, not custom artwork.
//
// Run manually whenever a new platform's logo is needed:
//   node scripts/generate-logos-icon-bundle.mjs
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getIcons } from '@iconify/utils'
import logosIconSet from '@iconify-json/logos/icons.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))

// Keep in sync with every icon="logos:..." string used under src/modules/platforms.
const ICON_NAMES = [
  'datadog-icon',
  'prometheus',
  'zabbix',
]

const subset = getIcons(logosIconSet, ICON_NAMES)

if (!subset) {
  throw new Error('getIcons() returned nothing -- check ICON_NAMES against @iconify-json/logos/icons.json')
}

const missing = ICON_NAMES.filter(name => !subset.icons[name])
if (missing.length) {
  throw new Error(`Icon(s) not found in logos set: ${missing.join(', ')}`)
}

const outDir = join(__dirname, '..', 'src', 'iconify-bundle')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'logos-icons.json'), JSON.stringify(subset), 'utf-8')

console.log(`Wrote ${Object.keys(subset.icons).length} icons to src/iconify-bundle/logos-icons.json`)
