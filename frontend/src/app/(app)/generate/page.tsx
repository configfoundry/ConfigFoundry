import { GenerateView } from '@/modules/generate/GenerateView'

// Thin route file per the modules/<name> architecture -- implementation
// lives in modules/generate/. Route path unchanged (/generate).
export default function GeneratePage() {
  return <GenerateView />
}
