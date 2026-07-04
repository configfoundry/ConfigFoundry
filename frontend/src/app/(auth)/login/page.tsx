import { LoginView } from '@/modules/auth/LoginView'

// Thin route file per the modules/<name> architecture -- implementation
// lives in modules/auth/LoginView.tsx. Route path unchanged (/login).
export default function LoginPage() {
  return <LoginView />
}
