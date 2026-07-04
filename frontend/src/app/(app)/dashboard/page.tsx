import { DashboardView } from '@/modules/dashboard/DashboardView'

// Thin route file per the modules/<name> architecture -- implementation
// lives in modules/dashboard/DashboardView.tsx. Route path unchanged (/dashboard).
export default function DashboardPage() {
  return <DashboardView />
}
