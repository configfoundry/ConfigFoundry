'use client'

/**
 * Inventory module container -- UI-only migration of the old tab bar in
 * app/(app)/inventory/page.tsx. Same three tabs, same meta counts, same
 * ['meta'] query key. Tags and Lists intentionally stay under Settings
 * (not part of this module today) per product decision.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { api } from '@/lib/api'
import { DevicesView } from './DevicesView'
import { BandwidthView } from './BandwidthView'
import { SubnetsView } from './SubnetsView'

type TabKey = 'devices' | 'bandwidth' | 'subnets'

export function InventoryView() {
  const [tab, setTab] = useState<TabKey>('devices')
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.getMeta() })

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, v: TabKey) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="devices" label={`Devices${meta ? ` (${meta.deviceCount})` : ''}`} />
        <Tab value="bandwidth" label={`Bandwidth${meta ? ` (${meta.bandwidthCount})` : ''}`} />
        <Tab value="subnets" label={`Subnets${meta ? ` (${meta.subnetCount})` : ''}`} />
      </Tabs>

      {tab === 'devices' && <DevicesView />}
      {tab === 'bandwidth' && <BandwidthView />}
      {tab === 'subnets' && <SubnetsView />}
    </Box>
  )
}
