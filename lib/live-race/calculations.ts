// lib/live-race/calculations.ts

/**
 * Format pace in seconds per km to min:sec/km
 */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format time in seconds to HH:MM:SS
 */
export function formatTimeHMS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format time in seconds to M:SS for lap times
 */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate projected distance at 24 hours based on current average pace
 */
export function calculateProjectedDistance(
  currentDistanceKm: number,
  elapsedSeconds: number,
  totalRaceSeconds: number = 86400 // 24 hours
): number {
  if (elapsedSeconds === 0) return 0;
  const avgSpeed = currentDistanceKm / elapsedSeconds; // km/s
  return avgSpeed * totalRaceSeconds;
}

/**
 * Calculate gap to leader in time or distance
 */
export function calculateGap(
  leaderDistance: number,
  runnerDistance: number,
  runnerAvgPace: number
): {
  distanceKm: number;
  timeSeconds: number;
} {
  const distanceKm = leaderDistance - runnerDistance;
  const timeSeconds = distanceKm * runnerAvgPace;
  return { distanceKm, timeSeconds };
}

/**
 * Calculate rolling average pace over last N laps
 */
export function calculateRollingPace(
  lapPaces: number[],
  windowSize: number
): number {
  if (lapPaces.length === 0) return 0;
  const window = lapPaces.slice(-windowSize);
  return window.reduce((sum, pace) => sum + pace, 0) / window.length;
}

/**
 * Determine trend based on pace changes
 */
export function calculateTrend(
  currentLapPace: number,
  avgPace: number,
  threshold: number = 0.05 // 5%
): "up" | "down" | "stable" {
  const ratio = currentLapPace / avgPace;
  if (ratio < 1 - threshold) return "up"; // Faster than average (lower pace)
  if (ratio > 1 + threshold) return "down"; // Slower than average (higher pace)
  return "stable";
}

/**
 * Convert pace (sec/km) to speed (km/h)
 */
export function paceToSpeed(secondsPerKm: number): number {
  return 3600 / secondsPerKm;
}

/**
 * Convert speed (km/h) to pace (sec/km)
 */
export function speedToPace(kmPerHour: number): number {
  return 3600 / kmPerHour;
}








