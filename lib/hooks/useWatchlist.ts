// lib/hooks/useWatchlist.ts
"use client";

import { useState, useEffect, useCallback } from "react";

const WATCHLIST_KEY = "race_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<number[]>([]);

  // Load watchlist from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWatchlist(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error("Error parsing watchlist:", err);
        setWatchlist([]);
      }
    }
  }, []);

  // Save watchlist to localStorage
  const saveWatchlist = useCallback((bibs: number[]) => {
    setWatchlist(bibs);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(bibs));
  }, []);

  const addToWatchlist = useCallback(
    (bib: number) => {
      saveWatchlist([...watchlist, bib]);
    },
    [watchlist, saveWatchlist]
  );

  const removeFromWatchlist = useCallback(
    (bib: number) => {
      saveWatchlist(watchlist.filter((b) => b !== bib));
    },
    [watchlist, saveWatchlist]
  );

  const toggleWatchlist = useCallback(
    (bib: number) => {
      if (watchlist.includes(bib)) {
        removeFromWatchlist(bib);
      } else {
        addToWatchlist(bib);
      }
    },
    [watchlist, addToWatchlist, removeFromWatchlist]
  );

  const isInWatchlist = useCallback(
    (bib: number) => {
      return watchlist.includes(bib);
    },
    [watchlist]
  );

  const clearWatchlist = useCallback(() => {
    saveWatchlist([]);
  }, [saveWatchlist]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist,
  };
}





