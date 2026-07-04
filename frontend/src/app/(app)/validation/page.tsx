import { ValidationView } from '@/modules/validation/ValidationView'

// Thin route file per the modules/<name> architecture -- implementation
// lives in modules/validation/. Route path unchanged (/validation).
export default function ValidationPage() {
  return <ValidationView />
}
