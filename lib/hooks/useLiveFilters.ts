// lib/hooks/useLiveFilters.ts
// Hook to persist live page filters across navigation

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export type LiveFiltersState = Record<string, string>;

/**
 * Hook to persist filter state across page navigation using localStorage
 * @param pageKey Unique key for this page's filters (e.g., "live", "map", "countdown")
 * @param defaultFilters Default filter values
 * @returns Filter state and update function
 */
export function useLiveFilters(
  pageKey: string,
  defaultFilters: LiveFiltersState
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = `live-filters-${pageKey}`;

  // Initialize filters from URL params OR localStorage OR defaults
  const [filters, setFiltersState] = useState<LiveFiltersState>(() => {
    if (typeof window === "undefined") return defaultFilters;

    // Priority: URL params > localStorage > defaults
    const urlParams: LiveFiltersState = {};
    searchParams?.forEach((value, key) => {
      urlParams[key] = value;
    });

    // If URL has params, use those
    if (Object.keys(urlParams).length > 0) {
      return { ...defaultFilters, ...urlParams };
    }

    // Otherwise check localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedFilters = JSON.parse(stored);
        return { ...defaultFilters, ...parsedFilters };
      }
    } catch (error) {
      console.error("Failed to load filters from localStorage:", error);
    }

    return defaultFilters;
  });

  // Update filter and persist to both URL and localStorage
  const updateFilters = (updates: Partial<LiveFiltersState>) => {
    // Remove undefined values from updates
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    ) as LiveFiltersState;

    const newFilters = { ...filters, ...cleanUpdates };

    // Update state
    setFiltersState(newFilters);

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(newFilters));
    } catch (error) {
      console.error("Failed to save filters to localStorage:", error);
    }

    // Update URL
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== defaultFilters[key]) {
        params.set(key, value);
      }
    });

    const currentPath = window.location.pathname;
    const queryString = params.toString();
    router.push(
      queryString ? `${currentPath}?${queryString}` : currentPath,
      { scroll: false }
    );
  };

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save filters:", error);
    }
  }, [filters, storageKey]);

  return {
    filters,
    updateFilters,
    setFilter: (key: string, value: string) => {
      updateFilters({ [key]: value });
    },
  };
}
