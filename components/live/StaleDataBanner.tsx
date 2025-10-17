"use client";

// components/live/StaleDataBanner.tsx
// Warning banner when race data hasn't been updated recently

import { AlertTriangle, Clock } from "lucide-react";
import { useDataStaleness } from "@/lib/hooks/useDataStaleness";

export function StaleDataBanner() {
  const { isStale, minutesSinceLastFetch, loading } = useDataStaleness(30000);

  // Don't show anything while loading or if data is fresh
  if (loading || !isStale) {
    return null;
  }

  const minutesAgo = Math.round(minutesSinceLastFetch || 0);

  return (
    <div className="bg-orange-500/20 border-l-4 border-orange-500 px-4 py-3 mb-4 rounded">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
            Timing data may not be current
          </p>
          <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
            {minutesAgo !== null && (
              <>
                <Clock className="inline h-3 w-3 mr-1" />
                Last updated {minutesAgo} minute{minutesAgo !== 1 ? "s" : ""}{" "}
                ago
              </>
            )}
            {minutesAgo === null && "Unable to determine last update time"}
          </p>
        </div>
      </div>
    </div>
  );
}
