'use client'

// ---------------------------------------------------------------------------
// Registers the offline tabler icon subset (see scripts/generate-icon-bundle.mjs)
// with @iconify/react's internal icon storage. Importing this file for its
// side effect is enough -- once addCollection() runs, every <Icon icon="tabler:x" />
// in the app resolves from memory instead of calling out to
// api.iconify.design / api.unisvg.com / api.simplesvg.com, which the backend's
// CSP (connect-src 'self') blocks anyway.
//
// 'use client' is required here: @iconify/react ships a React class component
// internally, and app/layout.tsx (which imports this file) is a Server
// Component. Without this directive, webpack bundles @iconify/react into the
// RSC server graph, where "class extends PureComponent" has no real base
// class to extend -- "Class extends value undefined is not a constructor".
// Marking this module client-only keeps @iconify/react out of the server
// bundle entirely; the side-effecting addCollection() call still runs once,
// on the client, before the rest of the tree hydrates.
//
// Imported once, at the top of app/layout.tsx, before anything renders.
// ---------------------------------------------------------------------------
import { addCollection } from '@iconify/react'
import tablerIcons from './tabler-icons.json'

addCollection(tablerIcons)
