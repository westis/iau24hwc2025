// types/live-race.ts
export type RaceState = "not_started" | "live" | "finished";

export interface LapTime {
  id?: number;
  bib: number;
  lap: number;
  lapTimeSec: number;
  raceTimeSec: number;
  distanceKm: number;
  rank: number;
  genderRank: number;
  ageGroupRank: number;
  lapPace: number; // seconds per km
  avgPace: number; // seconds per km
  timestamp: string;
}

export interface LeaderboardEntry {
  bib: number;
  name: string;
  rank: number;
  genderRank: number;
  distanceKm: number;
  projectedKm: number;
  raceTimeSec: number;
  lapPaceSec: number;
  lapTimeSec: number;
  lap: number;
  gender: "m" | "w";
  timestamp: string;
  country: string;
  trend?: "up" | "down" | "stable";
  lastPassing?: string; // ISO timestamp
}

export interface RaceUpdate {
  id: number;
  content: string;
  contentSv?: string; // Swedish version
  updateType: "ai" | "milestone" | "lead_change" | "manual";
  priority: "low" | "medium" | "high";
  relatedBibs?: number[]; // Related runner bibs
  relatedCountries?: string[];
  timestamp: string;
  createdAt: string;
}

export interface RaceConfig {
  id: number;
  raceId: number;
  raceState: RaceState;
  courseGeojson?: any; // GeoJSON of course loop
  courseDistanceKm?: number; // Loop distance
  timingPointOffset?: number; // Offset in meters from start
  lastDataFetch?: string;
  dataSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartDataPoint {
  time: number; // Elapsed seconds
  distanceKm: number;
  projectedKm: number;
  avgPace: number;
  rollingPace?: number;
  bib: number;
}

export interface RunnerChartData {
  bib: number;
  name: string;
  country: string;
  gender: "m" | "w";
  color: string;
  data: ChartDataPoint[];
}

export interface WatchlistData {
  bibs: number[];
}

export interface RaceClockData {
  raceState: RaceState;
  startTime: string;
  endTime: string;
  elapsedSeconds: number;
  remainingSeconds: number;
}

// API response types
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  raceState: RaceState;
  lastUpdate: string;
  totalRunners: number;
}

export interface LapTimesResponse {
  bib: number;
  name: string;
  laps: LapTime[];
}

export interface ChartDataResponse {
  runners: RunnerChartData[];
  startTime: string;
  currentTime: string;
}




