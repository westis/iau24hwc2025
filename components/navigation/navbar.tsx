'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, X, Shield, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const pathname = usePathname()
  const { isAdmin, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const publicNavItems = [
    { href: '/', label: 'Home' },
    { href: '/runners', label: 'Runners' },
    { href: '/teams', label: 'Teams' },
    { href: '/rankings', label: 'Rankings' },
  ]

  const adminNavItems = [
    { href: '/matching', label: 'Matching', adminOnly: true },
  ]

  const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-lg font-semibold tracking-tight">
            IAU 24h WC 2025
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">Admin</span>
                </Button>
              </Link>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-3">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border">
                {isAdmin ? (
                  <Button
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                    <LogOut className="h-4 w-4 ml-auto" />
                  </Button>
                ) : (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
