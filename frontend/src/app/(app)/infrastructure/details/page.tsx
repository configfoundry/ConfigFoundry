'use client'

import { useSearchParams } from 'next/navigation'
import { DeviceDetailsView } from '@/modules/inventory/DeviceDetailsView'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * Thin route file per the modules/<name> architecture -- implementation
 * lives in modules/inventory/DeviceDetailsView.tsx (see that file's header
 * for the technical-debt notes on this being a client-side-only detail page
 * built against the existing ['devices'] list query, per approved Strategy
 * A -- no new backend endpoint).
 *
 * This is a query-param route (/infrastructure/details?id=...), not a
 * dynamic segment (/infrastructure/[id]) -- production builds use
 * `output: 'export'` (next.config.mjs; FastAPI serves frontend/out/ as
 * static files), which requires generateStaticParams() for any dynamic path
 * segment. Device IDs are backend-generated at runtime and unbounded, so
 * there's no fixed set of paths to pre-render. A query-param route needs no
 * static params at all: every device resolves to the same pre-built
 * details/index.html, and the id is read client-side, exactly like the
 * rest of this client-only page already works.
 *
 * Route renamed from /inventory/details as part of the Infrastructure IA
 * rename.
 */
export default function DeviceDetailsPage() {
  const searchParams = useSearchParams()
  const deviceId = searchParams.get('id')

  if (!deviceId) {
    return (
      <EmptyState
        title="No device selected"
        sub="Open a device from the Infrastructure list to view its details."
      />
    )
  }

  return <DeviceDetailsView deviceId={deviceId} />
}
