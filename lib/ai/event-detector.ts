// lib/ai/event-detector.ts
// Cost-optimized event detection for AI commentary generation
// Target: ~30 events per 24-hour race to keep costs under $1

import { createClient } from "@/lib/supabase/server";
import type {
  RaceEvent,
  LeaderboardEntry,
  RaceEventType,
  EventPriority,
  BreakStartedEventData,
  BreakEndedEventData,
  LeadChangeEventData,
  SignificantMoveEventData,
  PaceChangeEventData,
  RecordPaceEventData,
} from "@/types/live-race";

// Cost-optimized thresholds to reduce event count
const THRESHOLDS = {
  // Break detection - only long breaks or top runners
  BREAK_MIN_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  BREAK_TOP_RANK: 10, // Only report breaks for top 10 runners

  // Position changes - only significant moves
  SIGNIFICANT_MOVE_POSITIONS: 8, // Must move 8+ positions
  SIGNIFICANT_MOVE_TOP_5: 3, // Or 3+ positions if in/entering top 5

  // Pace changes - only dramatic
  PACE_CHANGE_PERCENT: 25, // Must be 25%+ faster/slower

  // Record pace - projecting for records
  RECORD_PACE_MEN_KM: 300, // Men's threshold
  RECORD_PACE_WOMEN_KM: 270, // Women's threshold

  // Milestones - only major ones
  MILESTONES: [100, 150, 200, 250, 280, 300],

  // Team battles - close competition
  TEAM_BATTLE_GAP_KM: 5, // Top 3 teams within 5km

  // Priority countries for focused coverage
  PRIORITY_COUNTRIES: ["SWE", "NOR", "DEN", "FIN"],
};

// In-memory cache of previous state (to detect changes)
let previousLeaderboard: LeaderboardEntry[] = [];
let detectedBreaks = new Map<number, number>(); // bib -> timestamp of break start

/**
 * Detect race events by comparing current state with previous state
 * Returns array of detected events
 */
export async function detectRaceEvents(): Promise<Omit<RaceEvent, "id" | "createdAt">[]> {
  const supabase = await createClient();
  const events: Omit<RaceEvent, "id" | "createdAt">[] = [];

  // Get active race
  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id, start_time")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.log("No active race found");
    return [];
  }

  // Get current leaderboard
  const { data: currentLeaderboard } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true });

  if (!currentLeaderboard || currentLeaderboard.length === 0) {
    console.log("No leaderboard data");
    return [];
  }

  // Convert snake_case to camelCase
  const leaderboard: LeaderboardEntry[] = currentLeaderboard.map((entry: any) => ({
    bib: entry.bib,
    name: entry.name,
    rank: entry.rank,
    genderRank: entry.gender_rank,
    distanceKm: entry.distance_km,
    projectedKm: entry.projected_km,
    raceTimeSec: entry.race_time_sec,
    lapPaceSec: entry.lap_pace_sec,
    lapTimeSec: entry.lap_time_sec,
    lap: entry.lap,
    gender: entry.gender,
    timestamp: entry.timestamp,
    country: entry.country,
    trend: entry.trend,
    lastPassing: entry.last_passing,
  }));

  const now = new Date();

  // 1. DETECT BREAKS (High priority: top 10 or priority countries, long breaks only)
  for (const runner of leaderboard) {
    if (!runner.lastPassing) continue;

    const timeSinceLastLap = now.getTime() - new Date(runner.lastPassing).getTime();
    const isOnBreak = timeSinceLastLap > THRESHOLDS.BREAK_MIN_DURATION_MS;
    const wasOnBreak = detectedBreaks.has(runner.bib);

    // Break started - only report if top 10 or priority country
    if (isOnBreak && !wasOnBreak) {
      const shouldReport =
        runner.rank <= THRESHOLDS.BREAK_TOP_RANK ||
        THRESHOLDS.PRIORITY_COUNTRIES.includes(runner.country);

      if (shouldReport) {
        detectedBreaks.set(runner.bib, now.getTime());
        events.push({
          raceId: activeRace.id,
          eventType: "break_started",
          priority: runner.rank <= 5 ? "high" : "medium",
          relatedBibs: [runner.bib],
          relatedCountries: [runner.country],
          eventData: {
            runner,
            timeSinceLastLap,
          } as BreakStartedEventData,
          commentaryGenerated: false,
          timestamp: now.toISOString(),
        });
      }
    }

    // Break ended
    if (!isOnBreak && wasOnBreak) {
      const breakStart = detectedBreaks.get(runner.bib)!;
      detectedBreaks.delete(runner.bib);
      events.push({
        raceId: activeRace.id,
        eventType: "break_ended",
        priority: runner.rank <= 5 ? "high" : "medium",
        relatedBibs: [runner.bib],
        relatedCountries: [runner.country],
        eventData: {
          runner,
          breakDuration: now.getTime() - breakStart,
        } as BreakEndedEventData,
        commentaryGenerated: false,
        timestamp: now.toISOString(),
      });
    }
  }

  // 2. DETECT LEAD CHANGES (Always high priority)
  if (previousLeaderboard.length > 0) {
    // Men's leader
    const currentMenLeader = leaderboard.find(r => r.gender === "m");
    const previousMenLeader = previousLeaderboard.find(r => r.gender === "m");

    if (
      currentMenLeader &&
      previousMenLeader &&
      currentMenLeader.bib !== previousMenLeader.bib
    ) {
      const gap = currentMenLeader.distanceKm - (
        leaderboard.find(r => r.bib === previousMenLeader.bib)?.distanceKm || 0
      );

      events.push({
        raceId: activeRace.id,
        eventType: "lead_change",
        priority: "high",
        relatedBibs: [currentMenLeader.bib, previousMenLeader.bib],
        relatedCountries: [currentMenLeader.country, previousMenLeader.country],
        eventData: {
          newLeader: currentMenLeader,
          oldLeader: previousMenLeader,
          gap,
          gender: "m",
        } as LeadChangeEventData,
        commentaryGenerated: false,
        timestamp: now.toISOString(),
      });
    }

    // Women's leader
    const currentWomenLeader = leaderboard.find(r => r.gender === "w");
    const previousWomenLeader = previousLeaderboard.find(r => r.gender === "w");

    if (
      currentWomenLeader &&
      previousWomenLeader &&
      currentWomenLeader.bib !== previousWomenLeader.bib
    ) {
      const gap = currentWomenLeader.distanceKm - (
        leaderboard.find(r => r.bib === previousWomenLeader.bib)?.distanceKm || 0
      );

      events.push({
        raceId: activeRace.id,
        eventType: "lead_change",
        priority: "high",
        relatedBibs: [currentWomenLeader.bib, previousWomenLeader.bib],
        relatedCountries: [currentWomenLeader.country, previousWomenLeader.country],
        eventData: {
          newLeader: currentWomenLeader,
          oldLeader: previousWomenLeader,
          gap,
          gender: "w",
        } as LeadChangeEventData,
        commentaryGenerated: false,
        timestamp: now.toISOString(),
      });
    }
  }

  // 3. DETECT SIGNIFICANT POSITION MOVES (Selective: 8+ positions OR 3+ in top 5)
  if (previousLeaderboard.length > 0) {
    for (const runner of leaderboard) {
      const prevRunner = previousLeaderboard.find(r => r.bib === runner.bib);
      if (!prevRunner) continue;

      const positionsGained = prevRunner.rank - runner.rank;

      // Check if this is significant
      const isTop5Move = (runner.rank <= 5 || prevRunner.rank <= 5) &&
        Math.abs(positionsGained) >= THRESHOLDS.SIGNIFICANT_MOVE_TOP_5;
      const isBigMove = Math.abs(positionsGained) >= THRESHOLDS.SIGNIFICANT_MOVE_POSITIONS;

      if (isTop5Move || isBigMove) {
        events.push({
          raceId: activeRace.id,
          eventType: "significant_move",
          priority: isTop5Move ? "high" : "medium",
          relatedBibs: [runner.bib],
          relatedCountries: [runner.country],
          eventData: {
            runner,
            oldRank: prevRunner.rank,
            newRank: runner.rank,
            positionsGained,
            timeframe: 5, // Detection runs every 5 minutes
          } as SignificantMoveEventData,
          commentaryGenerated: false,
          timestamp: now.toISOString(),
        });
      }
    }
  }

  // 4. DETECT DRAMATIC PACE CHANGES (Only if >25% change AND leads to position change)
  for (const runner of leaderboard) {
    if (!runner.lapPaceSec) continue;

    const prevRunner = previousLeaderboard.find(r => r.bib === runner.bib);
    if (!prevRunner || !prevRunner.lapPaceSec) continue;

    // Calculate average pace from recent laps (if available)
    const avgPace = await getRunnerAveragePace(supabase, activeRace.id, runner.bib, 10);
    if (!avgPace) continue;

    const percentChange = ((avgPace - runner.lapPaceSec) / avgPace) * 100;
    const isDramaticChange = Math.abs(percentChange) >= THRESHOLDS.PACE_CHANGE_PERCENT;
    const rankChanged = prevRunner.rank !== runner.rank;

    if (isDramaticChange && rankChanged) {
      events.push({
        raceId: activeRace.id,
        eventType: percentChange > 0 ? "pace_surge" : "pace_drop",
        priority: runner.rank <= 10 ? "high" : "medium",
        relatedBibs: [runner.bib],
        relatedCountries: [runner.country],
        eventData: {
          runner,
          recentLapPace: runner.lapPaceSec,
          avgPace,
          percentChange: Math.abs(percentChange),
          direction: percentChange > 0 ? "faster" : "slower",
        } as PaceChangeEventData,
        commentaryGenerated: false,
        timestamp: now.toISOString(),
      });
    }
  }

  // 5. DETECT RECORD PACE (Runners on pace for >300km men, >270km women)
  const raceHours = (now.getTime() - new Date(activeRace.start_time).getTime()) / (1000 * 60 * 60);

  if (raceHours >= 6) { // Only check after 6 hours
    for (const runner of leaderboard) {
      const threshold =
        runner.gender === "m"
          ? THRESHOLDS.RECORD_PACE_MEN_KM
          : THRESHOLDS.RECORD_PACE_WOMEN_KM;

      if (runner.projectedKm >= threshold) {
        // Check if we haven't already reported this
        const alreadyReported = await hasEventBeenReported(
          supabase,
          activeRace.id,
          "record_pace",
          [runner.bib]
        );

        if (!alreadyReported) {
          events.push({
            raceId: activeRace.id,
            eventType: "record_pace",
            priority: "high",
            relatedBibs: [runner.bib],
            relatedCountries: [runner.country],
            eventData: {
              runner,
              projectedDistance: runner.projectedKm,
              recordThreshold: threshold,
              gender: runner.gender,
            } as RecordPaceEventData,
            commentaryGenerated: false,
            timestamp: now.toISOString(),
          });
        }
      }
    }
  }

  // Update previous state for next detection cycle
  previousLeaderboard = leaderboard;

  console.log(`Detected ${events.length} events`);
  return events;
}

/**
 * Get runner's average pace over last N laps
 */
async function getRunnerAveragePace(
  supabase: any,
  raceId: number,
  bib: number,
  lapCount: number
): Promise<number | null> {
  const { data: laps } = await supabase
    .from("race_laps")
    .select("lap_pace")
    .eq("race_id", raceId)
    .eq("bib", bib)
    .order("lap", { ascending: false })
    .limit(lapCount);

  if (!laps || laps.length === 0) return null;

  const sum = laps.reduce((acc: number, lap: any) => acc + lap.lap_pace, 0);
  return sum / laps.length;
}

/**
 * Check if an event has already been reported (to avoid duplicates)
 */
async function hasEventBeenReported(
  supabase: any,
  raceId: number,
  eventType: RaceEventType,
  relatedBibs: number[]
): Promise<boolean> {
  const { data } = await supabase
    .from("race_events")
    .select("id")
    .eq("race_id", raceId)
    .eq("event_type", eventType)
    .contains("related_bibs", relatedBibs)
    .limit(1);

  return (data && data.length > 0) || false;
}

/**
 * Insert detected events into database
 */
export async function storeDetectedEvents(
  events: Omit<RaceEvent, "id" | "createdAt">[]
): Promise<void> {
  if (events.length === 0) return;

  const supabase = await createClient();

  // Convert camelCase to snake_case for database
  const dbEvents = events.map((event) => ({
    race_id: event.raceId,
    event_type: event.eventType,
    priority: event.priority,
    related_bibs: event.relatedBibs,
    related_countries: event.relatedCountries,
    event_data: event.eventData,
    commentary_generated: event.commentaryGenerated,
    timestamp: event.timestamp,
  }));

  const { error } = await supabase
    .from("race_events")
    .insert(dbEvents);

  if (error) {
    console.error("Failed to store events:", error);
    throw error;
  }

  console.log(`Stored ${events.length} events in database`);
}
