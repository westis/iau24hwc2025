"use client";

// components/live/StaleDataBanner.tsx
// Warning banner when race data hasn't been updated recently

import { AlertTriangle, Clock } from "lucide-react";
import { useDataStaleness } from "@/lib/hooks/useDataStaleness";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatRelativeTimeString } from "@/lib/utils/time-format";
import type { RaceState } from "@/types/live-race";

interface StaleDataBannerProps {
  raceState?: RaceState;
}

export function StaleDataBanner({ raceState }: StaleDataBannerProps) {
  const { isStale, minutesSinceLastFetch, loading } = useDataStaleness(30000);
  const { t } = useLanguage();

  // Don't show anything while loading or if data is fresh
  if (loading || !isStale) {
    return null;
  }

  // Only show staleness warning when race is actually live or finished
  // Don't show before race starts - of course there's no data yet!
  if (raceState && raceState === "not_started") {
    return null;
  }

  return (
    <div className="bg-orange-500/20 border-l-4 border-orange-500 px-4 py-3 mb-4 rounded">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
            {t.live.staleDataWarning}
          </p>
          <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
            {minutesSinceLastFetch !== null ? (
              <>
                <Clock className="inline h-3 w-3 mr-1" />
                {t.live.staleDataLastUpdated.replace(
                  "{time}",
                  formatRelativeTimeString(minutesSinceLastFetch, t)
                )}
              </>
            ) : (
              t.live.staleDataUnknownTime
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

