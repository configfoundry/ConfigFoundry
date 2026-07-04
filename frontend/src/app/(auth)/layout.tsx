import type { ReactNode } from 'react'
import BlankLayout from '@/@core/layouts/BlankLayout'

/**
 * Shared auth layout. UI only; no routing or auth logic here.
 *
 * Replaces the earlier hand-built centered-card AuthLayout (own Box +
 * "ConfigFoundry" header, max-width 420) with Vuexy's actual BlankLayout --
 * a real vendor file, full-bleed, no assumptions about page content width.
 * The centered-card look doesn't apply anymore: Login now renders its own
 * full-width two-column split-screen (see modules/auth/LoginView.tsx),
 * which BlankLayout is designed to host.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <BlankLayout>{children}</BlankLayout>
}
