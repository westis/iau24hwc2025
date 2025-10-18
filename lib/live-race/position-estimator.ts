// lib/live-race/position-estimator.ts
// Calculate runner positions on the course map based on lap predictions

import type { LapTime, LeaderboardEntry, RunnerPosition } from "@/types/live-race";
import { predictNextLapTime } from "./lap-predictor";
import type { GPXTrack } from "@/lib/utils/gpx-parser";
import { getPositionAtProgress } from "@/lib/utils/gpx-parser";

export type RunnerStatus = "racing" | "pending" | "overdue" | "break";

export interface BreakDetectionConfig {
  thresholdMultiplier: number; // e.g., 2.5 means 2.5x predicted lap time
  overdueDisplaySeconds: number; // how long to show as overdue before marking as break
}

/**
 * Calculate runner's current position and status
 * @param leaderboardEntry Runner's leaderboard data
 * @param laps Runner's recent laps for prediction
 * @param track GPX track data
 * @param timingMatLat Timing mat latitude
 * @param timingMatLon Timing mat longitude
 * @param breakConfig Break detection configuration
 * @param avatarUrl Runner's optimized avatar URL (optional)
 * @param currentTime Current time (defaults to now)
 * @returns Runner position data
 */
export function calculateRunnerPosition(
  leaderboardEntry: LeaderboardEntry,
  laps: LapTime[],
  track: GPXTrack,
  timingMatLat: number,
  timingMatLon: number,
  breakConfig: BreakDetectionConfig,
  avatarUrl?: string | null,
  currentTime: Date = new Date()
): RunnerPosition {
  // Predict next lap time
  const prediction = predictNextLapTime(laps);

  // Use default lap time if no prediction available (no lap data)
  // Default: 12 minutes (720 seconds) - conservative estimate for 24h race
  const DEFAULT_LAP_TIME_SEC = 720;
  const predictedLapTime = prediction.predictedLapTime > 0
    ? prediction.predictedLapTime
    : DEFAULT_LAP_TIME_SEC;

  // Calculate time since last passing
  const lastPassingDate = leaderboardEntry.lastPassing
    ? new Date(leaderboardEntry.lastPassing)
    : new Date(currentTime.getTime() - predictedLapTime * 1000);

  const timeSinceLastPassing =
    (currentTime.getTime() - lastPassingDate.getTime()) / 1000;

  // Calculate progress through current lap (allow > 100% for pending state detection)
  const progressPercent = (timeSinceLastPassing / predictedLapTime) * 100;

  // Determine status and position
  let status: RunnerStatus = "racing";
  let lat = timingMatLat;
  let lon = timingMatLon;
  let timeOverdue: number | undefined;

  const expectedFinishTime =
    predictedLapTime * breakConfig.thresholdMultiplier;

  // Overshoot configuration - allow runners to continue moving past timing mat
  const MAX_OVERSHOOT_PROGRESS = 115; // Continue up to 15% past timing mat (115%)
  const MAX_OVERSHOOT_SECONDS = 90;   // Continue for up to 90 seconds after estimated crossing
  const PENDING_CONFIRMATION_WINDOW = 30; // seconds

  if (progressPercent < 100) {
    // Normal racing - before reaching timing mat
    status = "racing";
    const position = getPositionAtProgress(track, progressPercent);
    lat = position.lat;
    lon = position.lon;
  } else {
    // Past predicted timing mat crossing
    timeOverdue = timeSinceLastPassing - predictedLapTime;

    // Check if within overshoot window - continue moving with pending status
    if (timeOverdue <= MAX_OVERSHOOT_SECONDS && progressPercent <= MAX_OVERSHOOT_PROGRESS) {
      // Continue moving past timing mat while waiting for real timing data
      status = "pending";
      const position = getPositionAtProgress(track, progressPercent);
      lat = position.lat;
      lon = position.lon;
    } else if (timeOverdue <= PENDING_CONFIRMATION_WINDOW) {
      // Just past overshoot window - stop at timing mat with pending status
      status = "pending";
      lat = timingMatLat;
      lon = timingMatLon;
    } else if (timeOverdue > breakConfig.overdueDisplaySeconds) {
      // Way overdue - mark as on break
      status = "break";
      lat = timingMatLat;
      lon = timingMatLon;
    } else if (timeSinceLastPassing < expectedFinishTime) {
      // Overdue beyond confirmation window but within threshold
      status = "overdue";
      lat = timingMatLat;
      lon = timingMatLon;
    } else {
      // Way overdue - likely on break
      status = "break";
      lat = timingMatLat;
      lon = timingMatLon;
    }
  }

  return {
    bib: leaderboardEntry.bib,
    name: leaderboardEntry.name,
    country: leaderboardEntry.country,
    gender: leaderboardEntry.gender,
    avatarUrl,
    lat,
    lon,
    status,
    rank: leaderboardEntry.rank,
    genderRank: leaderboardEntry.genderRank,
    distanceKm: leaderboardEntry.distanceKm,
    timeSinceLastPassing,
    predictedLapTime: predictedLapTime,
    progressPercent,
    timeOverdue,
  };
}

/**
 * Calculate positions for multiple runners
 * @param leaderboard Array of leaderboard entries
 * @param lapsMap Map of bib number to lap times
 * @param track GPX track data
 * @param timingMatLat Timing mat latitude
 * @param timingMatLon Timing mat longitude
 * @param breakConfig Break detection configuration
 * @param avatarMap Map of bib number to avatar URL (optional)
 * @param currentTime Current time (defaults to now)
 * @returns Array of runner positions
 */
export function calculateAllRunnerPositions(
  leaderboard: LeaderboardEntry[],
  lapsMap: Map<number, LapTime[]>,
  track: GPXTrack,
  timingMatLat: number,
  timingMatLon: number,
  breakConfig: BreakDetectionConfig,
  avatarMap?: Map<number, string | null>,
  currentTime: Date = new Date()
): RunnerPosition[] {
  return leaderboard
    .map((entry) => {
      const laps = lapsMap.get(entry.bib) || [];
      // Don't skip runners with no lap data - they might be on break!
      // calculateRunnerPosition will handle it with defaults
      const avatarUrl = avatarMap?.get(entry.bib);
      return calculateRunnerPosition(
        entry,
        laps,
        track,
        timingMatLat,
        timingMatLon,
        breakConfig,
        avatarUrl,
        currentTime
      );
    })
    .filter((pos): pos is RunnerPosition => pos !== null);
}

/**
 * Group runners by status
 */
export function groupRunnersByStatus(positions: RunnerPosition[]): {
  racing: RunnerPosition[];
  overdue: RunnerPosition[];
  onBreak: RunnerPosition[];
} {
  const racing: RunnerPosition[] = [];
  const overdue: RunnerPosition[] = [];
  const onBreak: RunnerPosition[] = [];

  positions.forEach((pos) => {
    switch (pos.status) {
      case "racing":
        racing.push(pos);
        break;
      case "pending":
        // Pending runners are shown with racing runners (they're still on track)
        racing.push(pos);
        break;
      case "overdue":
        overdue.push(pos);
        break;
      case "break":
        onBreak.push(pos);
        break;
    }
  });

  // Sort on-break runners by time overdue (longest first)
  onBreak.sort((a, b) => (b.timeOverdue || 0) - (a.timeOverdue || 0));

  return { racing, overdue, onBreak };
}
