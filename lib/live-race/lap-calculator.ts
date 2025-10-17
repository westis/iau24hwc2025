// lib/live-race/lap-calculator.ts
// Calculate laps from distance increases when lap data isn't directly available

import type { LapTime, LeaderboardEntry } from "@/types/live-race";

export interface LapCalculationResult {
  newLaps: LapTime[];
  updatedDistance: number;
}

export interface LapCalculationConfig {
  lapDistanceKm: number; // Normal lap distance (e.g., 1.5)
  firstLapDistanceKm: number; // First lap distance (e.g., 0.1)
  tolerancePercent: number; // Tolerance for distance matching (default 10%)
}

/**
 * Calculate new laps from distance increase
 * Handles:
 * - First lap with different distance (100m start offset)
 * - Multiple laps completed between updates
 * - Distance measurement variations
 */
export function calculateNewLaps(
  bib: number,
  currentDistance: number,
  previousDistance: number,
  currentRaceTimeSec: number,
  previousRaceTimeSec: number,
  currentLap: number,
  config: LapCalculationConfig
): LapCalculationResult {
  const newLaps: LapTime[] = [];
  let distance = previousDistance;
  let raceTime = previousRaceTimeSec;
  let lapNumber = currentLap;

  // Calculate distance increase
  const distanceIncrease = currentDistance - previousDistance;

  // No significant increase, no new laps
  if (distanceIncrease < config.firstLapDistanceKm * 0.5) {
    return {
      newLaps: [],
      updatedDistance: currentDistance,
    };
  }

  // Determine if this is the first lap
  const isFirstLap = previousDistance === 0 || currentLap === 0;

  if (isFirstLap) {
    // First lap: Check if runner completed the first lap (100m or configured distance)
    const firstLapThreshold =
      config.firstLapDistanceKm * (1 - config.tolerancePercent / 100);

    if (currentDistance >= firstLapThreshold) {
      // Calculate time for first lap
      const lapTimeSec = currentRaceTimeSec - previousRaceTimeSec;
      const lapPace = lapTimeSec / config.firstLapDistanceKm;
      const avgPace = lapTimeSec / currentDistance;

      newLaps.push({
        bib,
        lap: 1,
        lapTimeSec,
        raceTimeSec: currentRaceTimeSec,
        distanceKm: currentDistance,
        rank: 0, // Will be updated by leaderboard
        genderRank: 0,
        ageGroupRank: 0,
        lapPace,
        avgPace,
        timestamp: new Date().toISOString(),
      });

      distance = currentDistance;
      raceTime = currentRaceTimeSec;
      lapNumber = 1;

      // Check if there are more laps after the first one
      const remainingDistance = currentDistance - config.firstLapDistanceKm;
      if (remainingDistance >= config.lapDistanceKm * 0.9) {
        // Recursively calculate additional laps
        const additionalLaps = calculateSubsequentLaps(
          bib,
          remainingDistance,
          config.firstLapDistanceKm,
          currentRaceTimeSec,
          raceTime,
          lapNumber,
          config
        );
        newLaps.push(...additionalLaps);
      }
    }
  } else {
    // Subsequent laps: Standard lap distance
    const lapsCompleted = Math.floor(
      distanceIncrease / config.lapDistanceKm + config.tolerancePercent / 100
    );

    if (lapsCompleted >= 1) {
      // Calculate time per lap (approximate if multiple laps)
      const totalTimeForLaps = currentRaceTimeSec - previousRaceTimeSec;
      const avgLapTime = totalTimeForLaps / lapsCompleted;

      for (let i = 0; i < lapsCompleted; i++) {
        lapNumber++;
        distance += config.lapDistanceKm;
        raceTime += avgLapTime;

        const lapPace = avgLapTime / config.lapDistanceKm;
        const avgPace = raceTime / distance;

        newLaps.push({
          bib,
          lap: lapNumber,
          lapTimeSec: avgLapTime,
          raceTimeSec: raceTime,
          distanceKm: distance,
          rank: 0,
          genderRank: 0,
          ageGroupRank: 0,
          lapPace,
          avgPace,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return {
    newLaps,
    updatedDistance: currentDistance,
  };
}

/**
 * Helper function to calculate subsequent laps after the first lap
 */
function calculateSubsequentLaps(
  bib: number,
  remainingDistance: number,
  alreadyCoveredDistance: number,
  currentRaceTimeSec: number,
  previousRaceTimeSec: number,
  startingLapNumber: number,
  config: LapCalculationConfig
): LapTime[] {
  const laps: LapTime[] = [];
  const lapsCompleted = Math.floor(
    remainingDistance / config.lapDistanceKm + config.tolerancePercent / 100
  );

  if (lapsCompleted < 1) return laps;

  const totalTimeForLaps = currentRaceTimeSec - previousRaceTimeSec;
  const avgLapTime = totalTimeForLaps / lapsCompleted;

  let distance = alreadyCoveredDistance;
  let raceTime = previousRaceTimeSec;
  let lapNumber = startingLapNumber;

  for (let i = 0; i < lapsCompleted; i++) {
    lapNumber++;
    distance += config.lapDistanceKm;
    raceTime += avgLapTime;

    const lapPace = avgLapTime / config.lapDistanceKm;
    const avgPace = raceTime / distance;

    laps.push({
      bib,
      lap: lapNumber,
      lapTimeSec: avgLapTime,
      raceTimeSec: raceTime,
      distanceKm: distance,
      rank: 0,
      genderRank: 0,
      ageGroupRank: 0,
      lapPace,
      avgPace,
      timestamp: new Date().toISOString(),
    });
  }

  return laps;
}

/**
 * Calculate laps for all runners in leaderboard
 * Compares current leaderboard with previous state
 */
export async function calculateLapsFromLeaderboard(
  currentLeaderboard: LeaderboardEntry[],
  previousLeaderboard: LeaderboardEntry[],
  config: LapCalculationConfig
): Promise<LapTime[]> {
  const allNewLaps: LapTime[] = [];

  // Create map of previous distances for quick lookup
  const previousDistanceMap = new Map<number, LeaderboardEntry>();
  previousLeaderboard.forEach((entry) => {
    previousDistanceMap.set(entry.bib, entry);
  });

  for (const current of currentLeaderboard) {
    const previous = previousDistanceMap.get(current.bib);

    if (!previous) {
      // New runner appeared - check if they've completed first lap
      if (current.distanceKm >= config.firstLapDistanceKm * 0.9) {
        const result = calculateNewLaps(
          current.bib,
          current.distanceKm,
          0,
          current.raceTimeSec,
          0,
          0,
          config
        );
        allNewLaps.push(...result.newLaps);
      }
    } else {
      // Existing runner - check for distance increase
      if (current.distanceKm > previous.distanceKm) {
        const result = calculateNewLaps(
          current.bib,
          current.distanceKm,
          previous.distanceKm,
          current.raceTimeSec,
          previous.raceTimeSec,
          previous.lap,
          config
        );
        allNewLaps.push(...result.newLaps);
      }
    }
  }

  return allNewLaps;
}

/**
 * Get current lap number from distance
 */
export function getLapNumberFromDistance(
  distanceKm: number,
  config: LapCalculationConfig
): number {
  if (distanceKm < config.firstLapDistanceKm) {
    return 0;
  }

  // First lap + subsequent full laps
  const remainingDistance = distanceKm - config.firstLapDistanceKm;
  return 1 + Math.floor(remainingDistance / config.lapDistanceKm);
}


