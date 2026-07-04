import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import './globals.css'
// Required by the ported Vuexy nav menu + Customizer drawer (both use
// PerfectScrollbar for the "shadow at scroll edge" effect).
import 'react-perfect-scrollbar/dist/css/styles.css'
// Side-effect only: registers the offline tabler icon subset so <Icon> never
// calls out to api.iconify.design (blocked by the backend's CSP anyway).
// Must run before anything renders.
import '@/iconify-bundle/register'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeModeProvider } from '@/providers/ThemeModeProvider'

// Vuexy's real typography (@core/theme/typography) specifies 'Public Sans' as
// the primary font; load it so migrated pages actually render in it instead
// of silently falling back to sans-serif.
const publicSans = Public_Sans({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'ConfigFoundry',
  description: 'Shared SNMP/ICMP collector config YAML generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Apply theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cf-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className={publicSans.className}>
        <QueryProvider>
          <ThemeModeProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </ThemeModeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
