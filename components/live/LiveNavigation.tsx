"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { List, BarChart3, Map, Timer, CloudSun, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";

export function LiveNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useSupabaseAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count for authenticated users
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/race/updates/unread-count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    }

    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    {
      href: "/live",
      label: t.live?.leaderboard || "Resultatlista",
      icon: List,
    },
    {
      href: "/live/updates",
      label: t.live?.updates || "Uppdateringar",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      href: "/live/charts",
      label: t.live?.charts || "Diagram",
      icon: BarChart3,
    },
    { href: "/live/map", label: t.live?.map || "Karta", icon: Map },
    {
      href: "/live/countdown",
      label: t.live?.countdown || "Countdown",
      icon: Timer,
    },
    {
      href: "/live/weather",
      label: t.live?.weatherForecast || "Väder",
      icon: CloudSun,
    },
  ];

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="relative">
          {/* All screen sizes: Icon + Text with overflow scroll if needed */}
          <nav
            className="flex gap-0.5 sm:gap-1 overflow-x-auto scroll-smooth pb-0.5 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary relative whitespace-nowrap h-11 px-2 sm:px-3 flex-shrink-0"
                    data-active={isActive}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    <span className="text-xs sm:text-sm">
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
