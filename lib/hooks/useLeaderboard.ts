// lib/hooks/useLeaderboard.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { LeaderboardResponse } from "@/types/live-race";

export type LeaderboardFilter = "overall" | "men" | "women" | "watchlist";

export function useLeaderboard(
  filter: LeaderboardFilter = "overall",
  watchlistBibs: number[] = [],
  pollInterval: number = 60000 // 60 seconds
) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const filterParam = filter === "watchlist" ? "overall" : filter;
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const res = await fetch(
        `/api/race/leaderboard?filter=${filterParam}&_t=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const result: LeaderboardResponse = await res.json();

      // Filter for watchlist on client side
      if (filter === "watchlist" && watchlistBibs.length > 0) {
        result.entries = result.entries.filter((entry) =>
          watchlistBibs.includes(entry.bib)
        );
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter, watchlistBibs]);

  useEffect(() => {
    fetchLeaderboard();

    // Always poll - the API will return current state
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchLeaderboard, pollInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeaderboard,
  };
}
