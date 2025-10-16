// lib/live-race/cache.ts
// Simple in-memory cache for race data to reduce database load

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class RaceDataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Single global instance
export const raceCache = new RaceDataCache();

// Helper to generate cache keys
export const cacheKeys = {
  leaderboard: (filter: string) => `leaderboard:${filter}`,
  laps: (bib: number) => `laps:${bib}`,
  teams: (gender: string) => `teams:${gender}`,
  chartData: (bibs: string) => `chart:${bibs}`,
  config: () => "config",
};
