import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navigation/navbar'
import { ThemeProvider } from '@/components/theme-provider'
import { SeedDataLoader } from '@/components/seed-data-loader'
import { AuthProvider } from '@/lib/auth/auth-context'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export const metadata: Metadata = {
  title: 'IAU 24h World Championships 2025',
  description: 'Runner analytics for IAU 24h World Championships in Albi, France',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <SeedDataLoader />
              <Navbar />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
