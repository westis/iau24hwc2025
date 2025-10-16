// lib/live-race/position-estimator.ts
// Calculate runner positions on the course map based on lap predictions

import type { LapTime, LeaderboardEntry } from "@/types/live-race";
import { predictNextLapTime } from "./lap-predictor";
import type { GPXTrack } from "@/lib/utils/gpx-parser";
import { getPositionAtProgress } from "@/lib/utils/gpx-parser";

export type RunnerStatus = "racing" | "overdue" | "break";

export interface RunnerPosition {
  bib: number;
  name: string;
  country: string;
  gender: "m" | "w";
  lat: number;
  lon: number;
  status: RunnerStatus;
  rank: number;
  genderRank: number;
  distanceKm: number;
  timeSinceLastPassing: number;
  predictedLapTime: number;
  progressPercent: number;
  timeOverdue?: number; // seconds overdue (only if status is 'overdue' or 'break')
}

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
  currentTime: Date = new Date()
): RunnerPosition {
  // Predict next lap time
  const prediction = predictNextLapTime(laps);

  // Calculate time since last passing
  const lastPassingDate = leaderboardEntry.lastPassing
    ? new Date(leaderboardEntry.lastPassing)
    : new Date(currentTime.getTime() - prediction.predictedLapTime * 1000);

  const timeSinceLastPassing =
    (currentTime.getTime() - lastPassingDate.getTime()) / 1000;

  // Calculate progress through current lap
  const progressPercent = Math.min(
    100,
    (timeSinceLastPassing / prediction.predictedLapTime) * 100
  );

  // Determine status and position
  let status: RunnerStatus = "racing";
  let lat = timingMatLat;
  let lon = timingMatLon;
  let timeOverdue: number | undefined;

  const expectedFinishTime =
    prediction.predictedLapTime * breakConfig.thresholdMultiplier;

  if (timeSinceLastPassing > prediction.predictedLapTime) {
    // Runner is overdue
    timeOverdue = timeSinceLastPassing - prediction.predictedLapTime;

    if (timeOverdue > breakConfig.overdueDisplaySeconds) {
      // Mark as on break
      status = "break";
      // Position at timing mat
      lat = timingMatLat;
      lon = timingMatLon;
    } else if (timeSinceLastPassing < expectedFinishTime) {
      // Still overdue but within threshold - keep estimating position
      status = "overdue";
      const position = getPositionAtProgress(track, progressPercent);
      lat = position.lat;
      lon = position.lon;
    } else {
      // Way overdue - likely on break
      status = "break";
      lat = timingMatLat;
      lon = timingMatLon;
    }
  } else {
    // Runner is on pace - calculate position along track
    status = "racing";
    const position = getPositionAtProgress(track, progressPercent);
    lat = position.lat;
    lon = position.lon;
  }

  return {
    bib: leaderboardEntry.bib,
    name: leaderboardEntry.name,
    country: leaderboardEntry.country,
    gender: leaderboardEntry.gender,
    lat,
    lon,
    status,
    rank: leaderboardEntry.rank,
    genderRank: leaderboardEntry.genderRank,
    distanceKm: leaderboardEntry.distanceKm,
    timeSinceLastPassing,
    predictedLapTime: prediction.predictedLapTime,
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
  currentTime: Date = new Date()
): RunnerPosition[] {
  return leaderboard
    .map((entry) => {
      const laps = lapsMap.get(entry.bib) || [];
      if (laps.length === 0) {
        // Skip runners with no lap data
        return null;
      }
      return calculateRunnerPosition(
        entry,
        laps,
        track,
        timingMatLat,
        timingMatLon,
        breakConfig,
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
