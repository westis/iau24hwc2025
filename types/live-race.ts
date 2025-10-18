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

// Media types for race updates
export type RaceUpdateMediaType =
  | "text"
  | "audio"
  | "video"
  | "image"
  | "instagram"
  | "text_image";

// Update categories for filtering
export type RaceUpdateCategory =
  | "summary"
  | "urgent"
  | "general"
  | "interview"
  | "team_sweden";

export interface RaceUpdate {
  id: number;
  content: string;
  contentSv?: string; // Swedish version
  updateType: "ai" | "milestone" | "lead_change" | "manual" | "ai_summary";
  priority: "low" | "medium" | "high";
  relatedBibs?: number[]; // Related runner bibs
  relatedCountries?: string[];
  timestamp: string;
  createdAt: string;

  // New multimedia fields
  mediaType?: RaceUpdateMediaType;
  mediaUrl?: string; // URL to media file (Vercel Blob, YouTube, Instagram, etc.)
  mediaDescription?: string; // Text description or transcript for accessibility
  mediaCredit?: string; // Credit/attribution for media (photographer, Instagram handle, etc.)
  mediaCreditUrl?: string; // Optional URL for media credit (Instagram profile, etc.)
  category?: RaceUpdateCategory;
  allowComments?: boolean;
  commentCount?: number;

  // Sticky/pinned posts
  isSticky?: boolean;
  stickyOrder?: number;
}

// Comment on a race update
export interface RaceUpdateComment {
  id: number;
  updateId: number;
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  chatUsers: {
    displayName: string;
    avatarUrl: string | null;
  };
}

// Read tracking for unread badges
export interface RaceUpdateRead {
  userId: string;
  updateId: number;
  readAt: string;
}

export interface RaceConfig {
  id: number;
  raceId: number;
  raceState: RaceState;
  courseGeojson?: any; // GeoJSON of course loop
  courseDistanceKm?: number; // Loop distance
  timingPointOffset?: number; // Offset in meters from start
  crewSpotOffsetMeters?: number; // Offset in meters for crew spot (positive = after timing mat, negative = before)
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

export interface NextLapPrediction {
  bib: number;
  name: string;
  country: string;
  gender: "m" | "w";
  lastPassingTime: string; // ISO timestamp
  timeSinceLastPassing: number; // seconds
  predictedLapTime: number; // seconds
  timeUntilTimingMat: number; // seconds (can be negative if overdue)
  timeUntilCrewSpot: number; // seconds (can be negative)
  confidence: number; // 0-1, based on lap consistency
  recentLaps: number[]; // lap times used for prediction
  distanceKm: number; // total distance covered
  genderRank: number; // current gender rank
}

export interface CountdownResponse {
  predictions: NextLapPrediction[];
  crewSpotOffset: number; // meters
  lapDistance: number; // km
  lastUpdate: string;
}

// Map-related types
export interface RunnerPosition {
  bib: number;
  name: string;
  country: string;
  gender: "m" | "w";
  avatarUrl?: string | null;
  lat: number;
  lon: number;
  status: "racing" | "pending" | "overdue" | "break";
  rank: number;
  genderRank: number;
  distanceKm: number;
  timeSinceLastPassing: number;
  predictedLapTime: number;
  progressPercent: number;
  timeOverdue?: number;
}

export interface MapConfig {
  timingMatLat: number;
  timingMatLon: number;
  breakThreshold: number;
  overdueDisplaySeconds: number;
  courseGpxUrl: string;
}

export interface PositionsResponse {
  positions: RunnerPosition[];
  onBreak: RunnerPosition[];
  timingMatPosition: { lat: number; lon: number };
  crewSpotPosition: { lat: number; lon: number } | null;
  courseTrack: { lat: number; lon: number }[];
  lastUpdate: string;
}

// AI Commentary & Event Detection Types

export type RaceEventType =
  | "break_started"
  | "break_ended"
  | "lead_change"
  | "significant_move"
  | "pace_surge"
  | "pace_drop"
  | "milestone"
  | "record_pace"
  | "team_battle";

export type EventPriority = "low" | "medium" | "high";

// Base event interface
export interface RaceEvent {
  id: number;
  raceId: number;
  eventType: RaceEventType;
  priority: EventPriority;
  relatedBibs: number[];
  relatedCountries: string[];
  eventData: Record<string, any>; // Flexible JSONB data
  commentaryGenerated: boolean;
  commentaryId?: number;
  generationAttemptedAt?: string;
  generationError?: string;
  timestamp: string;
  createdAt: string;
}

// Specific event data structures
export interface BreakStartedEventData {
  runner: LeaderboardEntry;
  timeSinceLastLap: number; // milliseconds
  lastLap?: LapTime;
}

export interface BreakEndedEventData {
  runner: LeaderboardEntry;
  breakDuration: number; // milliseconds
}

export interface LeadChangeEventData {
  newLeader: LeaderboardEntry;
  oldLeader: LeaderboardEntry;
  gap: number; // km
  gender: "m" | "w";
}

export interface SignificantMoveEventData {
  runner: LeaderboardEntry;
  oldRank: number;
  newRank: number;
  positionsGained: number;
  timeframe: number; // minutes
}

export interface PaceChangeEventData {
  runner: LeaderboardEntry;
  recentLapPace: number; // sec/km
  avgPace: number; // sec/km
  percentChange: number;
  direction: "faster" | "slower";
}

export interface MilestoneEventData {
  runner: LeaderboardEntry;
  milestone: number; // km (100, 150, 200, 250, etc.)
}

export interface RecordPaceEventData {
  runner: LeaderboardEntry;
  projectedDistance: number; // km
  recordThreshold: number; // km (300 for men, 270 for women)
  gender: "m" | "w";
}

export interface TeamBattleEventData {
  teams: Array<{
    country: string;
    total: number; // km
    rank: number;
  }>;
  gap: number; // km between first and last
}

// AI Commentary Context
export interface CommentaryContext {
  currentTime: string;
  raceHour: number;
  elapsedHours: number;
  event: RaceEvent;
  recentDevelopments?: {
    leaderboardChanges: Array<{
      runner: LeaderboardEntry;
      oldRank: number;
      newRank: number;
    }>;
    breaks: Array<{
      runner: LeaderboardEntry;
      duration: number;
    }>;
  };
  teamStandings?: Array<{
    country: string;
    rank: number;
    total: number;
    runners: LeaderboardEntry[];
  }>;
  runnerNotes?: string;
  personalBest?: number;
  expectedPerformance?: {
    distance: number;
    storyline: string;
  };
}

// API Response for race updates with filtering
export interface RaceUpdatesResponse {
  updates: RaceUpdate[];
  totalCount: number;
  hasMore: boolean;
  unreadCount?: number; // For authenticated users
}

// API Response for race update comments
export interface RaceUpdateCommentsResponse {
  comments: RaceUpdateComment[];
  totalCount: number;
}

// API Response for unread count
export interface RaceUpdateUnreadCountResponse {
  unreadCount: number;
  totalCount: number;
}
