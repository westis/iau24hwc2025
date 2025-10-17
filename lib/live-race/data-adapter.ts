// lib/live-race/data-adapter.ts
// Adapter pattern for different timing data sources

import type { LapTime, LeaderboardEntry } from "@/types/live-race";

export interface RaceDataSource {
  name: string;
  fetchLapData(): Promise<LapTime[]>;
  fetchLeaderboard(): Promise<LeaderboardEntry[]>;
}

/**
 * Generic JSON adapter - for simple JSON endpoints
 */
export class JsonDataAdapter implements RaceDataSource {
  name = "JSON";

  constructor(private lapUrl: string, private leaderboardUrl: string) {}

  async fetchLapData(): Promise<LapTime[]> {
    const res = await fetch(this.lapUrl);
    const data = await res.json();
    return data.laps || data;
  }

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetch(this.leaderboardUrl);
    const data = await res.json();
    return data.leaderboard || data;
  }
}

/**
 * DUV Live Results adapter (example)
 */
export class DUVAdapter implements RaceDataSource {
  name = "DUV";

  constructor(private raceUrl: string) {}

  async fetchLapData(): Promise<LapTime[]> {
    // TODO: Implement DUV-specific scraping/parsing
    throw new Error("DUV adapter not implemented");
  }

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    // TODO: Implement DUV-specific scraping/parsing
    throw new Error("DUV adapter not implemented");
  }
}

/**
 * MyLaps adapter (example)
 */
export class MyLapsAdapter implements RaceDataSource {
  name = "MyLaps";

  constructor(private eventId: string, private apiKey?: string) {}

  async fetchLapData(): Promise<LapTime[]> {
    // TODO: Implement MyLaps API integration
    throw new Error("MyLaps adapter not implemented");
  }

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    // TODO: Implement MyLaps API integration
    throw new Error("MyLaps adapter not implemented");
  }
}

/**
 * Custom HTML scraper adapter
 */
export class HtmlScraperAdapter implements RaceDataSource {
  name = "HTML Scraper";

  constructor(
    private url: string,
    private selectors: {
      lapTable?: string;
      leaderboardTable?: string;
    }
  ) {}

  async fetchLapData(): Promise<LapTime[]> {
    // TODO: Implement HTML scraping
    // This would use something like cheerio or puppeteer
    throw new Error("HTML scraper adapter not implemented");
  }

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    // TODO: Implement HTML scraping
    throw new Error("HTML scraper adapter not implemented");
  }
}

/**
 * Transform raw data to our internal format
 */
export function transformToInternalFormat(
  rawLaps: any[],
  rawLeaderboard: any[],
  mapping: {
    lap: (item: any) => Partial<LapTime>;
    leaderboard: (item: any) => Partial<LeaderboardEntry>;
  }
): { laps: LapTime[]; leaderboard: LeaderboardEntry[] } {
  const laps = rawLaps.map((item) => ({
    bib: 0,
    lap: 0,
    lapTimeSec: 0,
    raceTimeSec: 0,
    distanceKm: 0,
    rank: 0,
    genderRank: 0,
    ageGroupRank: 0,
    lapPace: 0,
    avgPace: 0,
    timestamp: new Date().toISOString(),
    ...mapping.lap(item),
  })) as LapTime[];

  const leaderboard = rawLeaderboard.map((item) => ({
    bib: 0,
    name: "",
    rank: 0,
    genderRank: 0,
    distanceKm: 0,
    projectedKm: 0,
    raceTimeSec: 0,
    lapPaceSec: 0,
    lapTimeSec: 0,
    lap: 0,
    gender: "m" as const,
    timestamp: new Date().toISOString(),
    country: "XXX",
    ...mapping.leaderboard(item),
  })) as LeaderboardEntry[];

  return { laps, leaderboard };
}






