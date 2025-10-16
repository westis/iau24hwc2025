// lib/live-race/mock-data-generator.ts
import type { LapTime, LeaderboardEntry } from "@/types/live-race";

interface MockRunner {
  bib: number;
  name: string;
  gender: "m" | "w";
  country: string;
  baseSpeed: number; // km/h
}

export function generateMockLapData(
  runners: MockRunner[],
  elapsedHours: number,
  courseDistanceKm: number = 0.821
): { laps: LapTime[]; leaderboard: LeaderboardEntry[] } {
  const laps: LapTime[] = [];
  // Use "now" as race start for testing purposes
  // This allows mock data to show up even when real race hasn't started
  const raceStartTime = new Date(Date.now() - elapsedHours * 60 * 60 * 1000);
  const currentTime = new Date();

  const runnerStats = runners.map((runner) => {
    const lapTimes: number[] = [];
    const lapDistances: number[] = [];
    let totalTime = 0;
    let totalDistance = 0;
    let lapNum = 0;

    // Simulate varying pace throughout the race
    while (totalTime < elapsedHours * 3600) {
      lapNum++;

      // Add fatigue factor (pace slows down over time)
      const fatigueMultiplier = 1 + (totalTime / (24 * 3600)) * 0.3; // Up to 30% slower

      // Add random variation (±10%)
      const variation = 0.9 + Math.random() * 0.2;

      // Calculate lap time in seconds
      const lapSpeed = runner.baseSpeed / (fatigueMultiplier * variation);
      const lapTimeSec = (courseDistanceKm / lapSpeed) * 3600;

      totalTime += lapTimeSec;
      totalDistance += courseDistanceKm;

      if (totalTime > elapsedHours * 3600) break;

      const lapPace = lapTimeSec / courseDistanceKm; // sec/km
      const avgPace = totalTime / totalDistance; // sec/km

      const lapTimestamp = new Date(raceStartTime.getTime() + totalTime * 1000);

      const lap: LapTime = {
        bib: runner.bib,
        lap: lapNum,
        lapTimeSec: Number(lapTimeSec.toFixed(2)),
        raceTimeSec: Number(totalTime.toFixed(2)),
        distanceKm: Number(totalDistance.toFixed(3)),
        rank: 0, // Will calculate later
        genderRank: 0, // Will calculate later
        ageGroupRank: 0, // Will calculate later
        lapPace: Number(lapPace.toFixed(2)),
        avgPace: Number(avgPace.toFixed(2)),
        timestamp: lapTimestamp.toISOString(),
      };

      laps.push(lap);
      lapTimes.push(lapTimeSec);
      lapDistances.push(totalDistance);
    }

    return {
      runner,
      totalDistance,
      totalTime,
      lapCount: lapNum,
      avgPace: totalTime / totalDistance,
      lastLapTime: lapTimes[lapTimes.length - 1] || 0,
      lastLapPace: lapTimes[lapTimes.length - 1] / courseDistanceKm || 0,
    };
  });

  // Sort by distance and assign ranks
  runnerStats.sort((a, b) => b.totalDistance - a.totalDistance);

  const leaderboard: LeaderboardEntry[] = runnerStats.map((stat, index) => {
    const genderRank = runnerStats.filter(
      (s, i) => i <= index && s.runner.gender === stat.runner.gender
    ).length;

    const projectedKm = ((24 * 3600) / stat.totalTime) * stat.totalDistance;

    // Calculate trend (simplified - compare current pace to average)
    const currentPaceRatio = stat.lastLapPace / stat.avgPace;
    let trend: "up" | "down" | "stable" = "stable";
    if (currentPaceRatio < 0.95) trend = "up"; // Faster than average
    if (currentPaceRatio > 1.05) trend = "down"; // Slower than average

    return {
      bib: stat.runner.bib,
      name: stat.runner.name,
      rank: index + 1,
      genderRank,
      distanceKm: Number(stat.totalDistance.toFixed(3)),
      projectedKm: Number(projectedKm.toFixed(3)),
      raceTimeSec: Number(stat.totalTime.toFixed(2)),
      lapPaceSec: Number(stat.lastLapPace.toFixed(2)),
      lapTimeSec: Number(stat.lastLapTime.toFixed(2)),
      lap: stat.lapCount,
      gender: stat.runner.gender,
      timestamp: currentTime.toISOString(),
      country: stat.runner.country,
      trend,
      lastPassing: new Date(
        raceStartTime.getTime() + stat.totalTime * 1000
      ).toISOString(),
    };
  });

  // Assign overall ranks to laps
  laps.forEach((lap) => {
    const leaderEntry = leaderboard.find((lb) => lb.bib === lap.bib);
    if (leaderEntry) {
      lap.rank = leaderEntry.rank;
      lap.genderRank = leaderEntry.genderRank;
    }
  });

  return { laps, leaderboard };
}

export function getDefaultMockRunners(): MockRunner[] {
  const maleRunners: MockRunner[] = [
    {
      bib: 101,
      name: "Alex Miller",
      gender: "m",
      country: "USA",
      baseSpeed: 11.5,
    },
    {
      bib: 102,
      name: "James Taylor",
      gender: "m",
      country: "GBR",
      baseSpeed: 11.2,
    },
    {
      bib: 103,
      name: "Yuki Tanaka",
      gender: "m",
      country: "JPN",
      baseSpeed: 11.0,
    },
    {
      bib: 104,
      name: "Pierre Dubois",
      gender: "m",
      country: "FRA",
      baseSpeed: 10.8,
    },
    {
      bib: 105,
      name: "Lars Hansen",
      gender: "m",
      country: "DNK",
      baseSpeed: 10.5,
    },
    {
      bib: 106,
      name: "Marco Rossi",
      gender: "m",
      country: "ITA",
      baseSpeed: 10.3,
    },
  ];

  const femaleRunners: MockRunner[] = [
    {
      bib: 201,
      name: "Sarah Kim",
      gender: "w",
      country: "KOR",
      baseSpeed: 10.2,
    },
    {
      bib: 202,
      name: "Emma Rodriguez",
      gender: "w",
      country: "ESP",
      baseSpeed: 10.0,
    },
    {
      bib: 203,
      name: "Anna Kowalski",
      gender: "w",
      country: "POL",
      baseSpeed: 9.8,
    },
    {
      bib: 204,
      name: "Lisa Bergström",
      gender: "w",
      country: "SWE",
      baseSpeed: 9.5,
    },
    {
      bib: 205,
      name: "Maria Silva",
      gender: "w",
      country: "PRT",
      baseSpeed: 9.2,
    },
  ];

  return [...maleRunners, ...femaleRunners];
}
