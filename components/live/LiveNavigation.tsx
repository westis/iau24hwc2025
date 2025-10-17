"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { List, BarChart3, Map, Timer, CloudSun } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LiveNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      href: "/live",
      label: t.live?.leaderboard || "Resultatlista",
      icon: List,
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
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                  data-active={isActive}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
