"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationButton } from "@/components/NotificationButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavItems = [
    { href: "/", label: t.common.home },
    { href: "/participants", label: t.common.participants },
    { href: "/news", label: t.common.news },
    { href: "/loppet", label: t.common.loppet },
    { href: "/stats", label: t.common.stats },
  ];

  const adminNavItems = [
    { href: "/match", label: t.common.match },
    { href: "/admin/news", label: t.common.manageNews },
    { href: "/admin/race", label: "Edit Race Info" },
    { href: "/admin/notifications", label: "Send Notifications" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight"
          >
            IAU 24h WC 2025
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-4 lg:gap-6">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm lg:text-base font-medium transition-colors ${
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm lg:text-base font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  {t.common.admin}
                  <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {adminNavItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    {t.common.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <NotificationButton />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <NotificationButton />
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-3">
            <div className="flex flex-col space-y-3">
              {publicNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">
                    {t.common.admin}
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium transition-colors pl-4 ${
                        pathname === item.href
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left pl-4"
                  >
                    {t.common.logout}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
