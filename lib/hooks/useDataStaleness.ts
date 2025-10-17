// lib/hooks/useDataStaleness.ts
// Hook to check if race data is stale

import { useEffect, useState } from "react";

interface StalenessData {
  isStale: boolean;
  lastFetch: string | null;
  minutesSinceLastFetch: number | null;
  message: string;
}

export function useDataStaleness(refreshInterval: number = 30000) {
  const [staleness, setStaleness] = useState<StalenessData>({
    isStale: false,
    lastFetch: null,
    minutesSinceLastFetch: null,
    message: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStaleness = async () => {
      try {
        const response = await fetch("/api/race/staleness");
        if (response.ok) {
          const data = await response.json();
          setStaleness({
            isStale: data.isStale,
            lastFetch: data.lastFetch,
            minutesSinceLastFetch: data.minutesSinceLastFetch,
            message: data.message,
          });
        }
      } catch (error) {
        console.error("Error checking staleness:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check immediately
    checkStaleness();

    // Set up polling
    const interval = setInterval(checkStaleness, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { ...staleness, loading };
}
